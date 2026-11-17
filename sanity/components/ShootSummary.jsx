'use client';

/**
 * A saved shoot, at a glance: everything about it on one calm page, nothing to type in.
 * Press "Edit shoot" (here or in the header) to open the full form again.
 * Shown by FormChrome.jsx (BookingRoot) once a shoot has been saved. Styles: app/studio/studio.css (".lo-sv…").
 */

import { useEffect, useMemo, useState } from 'react';
import { useClient } from 'sanity';
import {
  categoryTitle,
  computeBudget,
  dayInfo,
  fmtDay,
  initials,
  KINDS,
  LINK_KINDS,
  lineTotal,
  LOCATION_TYPES,
  mapsUrl,
  money,
  percent,
  personCost,
  STATUS_FLOW,
  statusOf,
  relDay,
  reminderPlan,
  roleOf,
  scheduleFor,
  shootDays,
  tidyRange,
  timeRange,
  todayYmd,
} from '../bookingData';
import { CalendarIcon, CameraIcon, ClockIcon, KitIcon, LinkIcon, ListIcon, MailIcon, NoteIcon, PhoneIcon, PinIcon, PoundIcon, TruckIcon, UserIcon, UsersIcon } from './DashIcons';

const arr = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);
const text = (v) => (typeof v === 'string' ? v.trim() : '');
const telHref = (v) => `tel:${String(v).replace(/[^\d+]/g, '')}`;
const webHref = (v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);
const longDay = (d) => fmtDay(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDay = (d) => fmtDay(d, { weekday: 'short', day: 'numeric', month: 'short' });

function Card({ icon: I, title, count, wide, children }) {
  return (
    <section className="lo-sv-card" data-wide={wide ? '' : undefined}>
      <h3 className="lo-sv-title">
        <span className="lo-sv-ic" aria-hidden="true">
          <I />
        </span>
        {title}
        {count ? <em>{count}</em> : null}
      </h3>
      {children}
    </section>
  );
}

function Contact({ phone, email }) {
  if (!phone && !email) return null;
  return (
    <span className="lo-sv-contact">
      {phone ? (
        <a href={telHref(phone)}>
          <PhoneIcon /> {phone}
        </a>
      ) : null}
      {email ? (
        <a href={`mailto:${email}`}>
          <MailIcon /> {email}
        </a>
      ) : null}
    </span>
  );
}

function Fee({ amount, clientPays, paid }) {
  if (!amount) return null;
  return (
    <span className="lo-sv-fee" data-client={clientPays ? '' : undefined}>
      {money(amount)}
      {clientPays ? <small>client pays</small> : paid ? <small data-ok="">paid</small> : <small>to pay</small>}
    </span>
  );
}

/* the names of the kit picked for this shoot */
function useKitNames(refs) {
  const client = useClient({ apiVersion: '2024-10-01' });
  const key = refs.join(',');
  const [names, setNames] = useState({});
  useEffect(() => {
    if (!refs.length) return undefined;
    let alive = true;
    client
      .fetch('*[_id in $ids]{ _id, name }', { ids: [...refs, ...refs.map((r) => `drafts.${r}`)] })
      .then((list) => {
        if (!alive) return;
        const out = {};
        (list || []).forEach((k) => {
          const id = String(k._id).replace(/^drafts\./, '');
          if (k.name && (!out[id] || k._id.startsWith('drafts.'))) out[id] = k.name;
        });
        setNames(out);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key]);
  return names;
}

const IconTick = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.4 8.4l3.1 3L12.6 4.8" />
  </svg>
);

/* where it's up to: tap a step to move the shoot on (or back) */
function StatusTrack({ v, days, today, onStatus }) {
  const status = v.status || 'pencilled';
  const cancelled = status === 'cancelled';
  const at = STATUS_FLOW.indexOf(status);
  const last = days[days.length - 1] || '';
  const due = typeof v.deliveryDate === 'string' && v.deliveryDate ? v.deliveryDate.slice(0, 10) : '';
  const delivered = status === 'delivered';
  const late = due && !delivered && due < today;
  const nextUp = !cancelled && at >= 0 && at < STATUS_FLOW.length - 1 ? STATUS_FLOW[at + 1] : null;
  const backTo = !cancelled && at > 0 ? STATUS_FLOW[at - 1] : null;
  // a nudge when the shoot day has been and it's still marked as booked
  const shouldBeShot = last && last < today && (status === 'pencilled' || status === 'confirmed');
  return (
    <section className="lo-sv-track" data-cancelled={cancelled ? '' : undefined}>
      <div className="lo-sv-track-head">
        <span className="lo-sv-track-say">
          <b>Where it’s up to</b>
          <small>
            {cancelled
              ? 'This shoot is cancelled. It isn’t counted in your money.'
              : shouldBeShot
                ? 'The shoot day has been. Mark it as shot when you’re ready.'
                : 'Tap a step to move it on. Tap an earlier one to go back.'}
          </small>
        </span>
        <span className="lo-sv-track-tags">
          {due ? (
            <span className="lo-sv-tag" data-tone={delivered ? 'ok' : late ? 'warn' : ''}>
              {delivered ? 'Delivered' : late ? `${-daysBetweenSafe(today, due)} days late` : `Due ${relDay(due).toLowerCase()}`}
            </span>
          ) : (
            <span className="lo-sv-tag" data-tone="quiet">
              No due date
            </span>
          )}
          <button type="button" className="lo-sv-cancel" onClick={() => onStatus(cancelled ? 'confirmed' : 'cancelled')}>
            {cancelled ? 'Bring it back' : 'Cancel shoot'}
          </button>
        </span>
      </div>
      <ol className="lo-sv-steps" style={{ '--at': cancelled ? -1 : at, '--n': STATUS_FLOW.length }}>
        {STATUS_FLOW.map((s, i) => {
          const state = cancelled ? 'off' : i < at ? 'done' : i === at ? 'now' : 'next';
          return (
            <li key={s} data-state={state}>
              <button type="button" onClick={() => onStatus(s)} aria-pressed={state === 'now'} disabled={state === 'now'} title={statusOf(s).title}>
                <span className="lo-sv-step-dot" key={state}>
                  {state === 'done' || state === 'now' ? <IconTick /> : i + 1}
                </span>
                <span className="lo-sv-step-label">{statusOf(s).short}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {nextUp || backTo ? (
        <div className="lo-sv-moves">
          {nextUp ? (
            <button type="button" className="lo-sv-next" onClick={() => onStatus(nextUp)}>
              Mark as {statusOf(nextUp).short.toLowerCase()}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>
          ) : (
            <span className="lo-sv-finished">
              <IconTick /> Delivered. All done
            </span>
          )}
          {backTo ? (
            <button type="button" className="lo-sv-back" onClick={() => onStatus(backTo)}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M13 8H3M7 4L3 8l4 4" />
              </svg>
              Back to {statusOf(backTo).short.toLowerCase()}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
const daysBetweenSafe = (a, b) => {
  const x = new Date(`${a}T12:00:00`);
  const y = new Date(`${b}T12:00:00`);
  return Math.round((y - x) / 86400000);
};

export function ShootSummary({ value, onEdit, onStatus }) {
  const v = value && typeof value === 'object' ? value : {};
  const today = todayYmd();
  const b = useMemo(() => computeBudget(v), [v]);
  const days = shootDays(v);
  const c = v.client && typeof v.client === 'object' ? v.client : {};
  const locations = arr(v.locations).filter((l) => l.name || l.address);
  const people = arr(v.people).filter((p) => p.name || p.role);
  const quote = arr(v.quote).filter((l) => l.label || lineTotal(l));
  const costs = arr(v.costs).filter((l) => l.label || lineTotal(l));
  const payments = arr(v.payments).filter((p) => p.amount);
  const shots = arr(v.shotList).filter((s) => text(s.text));
  const notes = arr(v.notes).filter((n) => text(n.text));
  const links = arr(v.links).filter((l) => text(l.url));
  const kitRefs = arr(v.kit)
    .map((k) => k._ref)
    .filter(Boolean);
  const kitNames = useKitNames(kitRefs);
  const plan = days.map((d, i) => ({ d, i, lines: scheduleFor(v, d) })).filter((p) => p.lines.length);
  const reminders = reminderPlan(v, today);
  const kind = KINDS.find((k) => k.value === v.kind);
  const due = typeof v.deliveryDate === 'string' && v.deliveryDate ? v.deliveryDate.slice(0, 10) : '';
  const done = shots.filter((s) => s.done).length;

  const missing = [
    !days.length && 'the date',
    !(c.name || c.company) && 'the client',
    !locations.length && 'a location',
    !quote.length && 'your price',
    !plan.length && 'the schedule',
    !shots.length && 'a shot list',
    !kitRefs.length && 'the kit',
  ].filter(Boolean);

  return (
    <div className="lo-sv">
      <div className="lo-sv-bar">
        <span>
          <b>Everything about this shoot, in one place.</b>
          {missing.length ? ` Still to add: ${missing.join(', ')}.` : ' Nothing missing.'}
        </span>
        <button type="button" className="lo-sv-edit" onClick={onEdit}>
          Edit shoot
        </button>
      </div>

      {onStatus ? <StatusTrack v={v} days={days} today={today} onStatus={onStatus} /> : null}

      <div className="lo-sv-grid">
        {/* when */}
        <Card icon={CalendarIcon} title="When" count={days.length > 1 ? `${days.length} days` : ''}>
          {days.length ? (
            <ul className="lo-sv-days">
              {days.map((d, i) => {
                const info = dayInfo(v, d);
                return (
                  <li key={d} data-past={d < today ? '' : undefined}>
                    <span className="lo-sv-daynum">
                      <b>{fmtDay(d, { day: 'numeric' })}</b>
                      <small>{fmtDay(d, { month: 'short' })}</small>
                    </span>
                    <span className="lo-sv-daytext">
                      <b>{fmtDay(d, { weekday: 'long' })}</b>
                      <small>{[days.length > 1 ? `Day ${i + 1}` : '', timeRange(info.start, info.end), relDay(d), info.note].filter(Boolean).join(' · ')}</small>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="lo-sv-none">No date yet.</p>
          )}
          {due || text(v.deliverables) ? (
            <div className="lo-sv-due">
              <TruckIcon />
              <span>
                {due ? (
                  <b>
                    Due to the client {longDay(due)}
                    {v.status !== 'delivered' ? ` (${relDay(due).toLowerCase()})` : ''}
                  </b>
                ) : null}
                {text(v.deliverables) ? <small>{v.deliverables}</small> : null}
              </span>
            </div>
          ) : null}
        </Card>

        {/* who it's for */}
        <Card icon={UserIcon} title="Client">
          {c.name || c.company ? (
            <div className="lo-sv-client">
              <span className="lo-sv-avatar">{initials(c.name || c.company)}</span>
              <span>
                <b>{c.name || c.company}</b>
                {c.name && c.company ? <small>{c.company}</small> : null}
              </span>
            </div>
          ) : (
            <p className="lo-sv-none">No client added.</p>
          )}
          <Contact phone={c.phone} email={c.email} />
          {c.service || c.budget || kind ? (
            <dl className="lo-sv-facts">
              {kind ? (
                <>
                  <dt>Shoot</dt>
                  <dd>{kind.title}</dd>
                </>
              ) : null}
              {c.service ? (
                <>
                  <dt>Asked for</dt>
                  <dd>{c.service}</dd>
                </>
              ) : null}
              {c.budget ? (
                <>
                  <dt>Their budget</dt>
                  <dd>{tidyRange(c.budget)}</dd>
                </>
              ) : null}
            </dl>
          ) : null}
          {text(c.message) ? <blockquote className="lo-sv-quote">{c.message}</blockquote> : null}
        </Card>

        {/* where */}
        {locations.length ? (
          <Card icon={PinIcon} title="Locations" count={locations.length > 1 ? `${locations.length}` : ''} wide>
            <div className="lo-sv-places">
              {locations.map((l, i) => {
                const type = LOCATION_TYPES.find((t) => t.value === l.kind);
                const q = [l.name, l.address].filter(Boolean).join(', ');
                return (
                  <div key={l._key || i} className="lo-sv-place">
                    <div className="lo-sv-row">
                      <span>
                        <b>{l.name || l.address}</b>
                        {type ? <small>{type.title}</small> : null}
                      </span>
                      <Fee amount={l.hireFee} clientPays={l.clientPays} paid={l.paid} />
                    </div>
                    {l.address && l.name ? <p className="lo-sv-address">{l.address}</p> : null}
                    {l.contact || l.phone ? (
                      <p className="lo-sv-small">
                        {l.contact ? `Ask for ${l.contact}` : 'Contact'}
                        {l.phone ? (
                          <>
                            {' · '}
                            <a href={telHref(l.phone)}>{l.phone}</a>
                          </>
                        ) : null}
                      </p>
                    ) : null}
                    {text(l.notes) ? <p className="lo-sv-small">{l.notes}</p> : null}
                    <a className="lo-sv-map" href={mapsUrl(q)} target="_blank" rel="noopener noreferrer">
                      Open in Google Maps
                    </a>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        {/* who's on set */}
        {people.length ? (
          <Card icon={UsersIcon} title="Cast & crew" count={`${people.length}`}>
            <ul className="lo-sv-people">
              {people.map((p, i) => {
                const role = roleOf(p.role);
                return (
                  <li key={p._key || i}>
                    <span className="lo-sv-avatar" data-small="">
                      {initials(p.name || (role && role.title))}
                    </span>
                    <span className="lo-sv-person">
                      <b>{p.name || (role ? role.title : 'Someone')}</b>
                      <small>{[p.name && role ? role.title : '', p.agency, p.release ? 'Release signed' : ''].filter(Boolean).join(' · ')}</small>
                      <Contact phone={p.phone} email={p.email} />
                      {text(p.notes) ? <small>{p.notes}</small> : null}
                    </span>
                    <Fee amount={personCost(p)} clientPays={p.clientPays} paid={p.paid} />
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}

        {/* the plan for the day */}
        {plan.length ? (
          <Card icon={ClockIcon} title="Schedule">
            {plan.map((p) => (
              <div key={p.d} className="lo-sv-plan">
                {days.length > 1 ? <span className="lo-sv-plan-day">{shortDay(p.d)}</span> : null}
                <ul>
                  {p.lines.map((s, i) => (
                    <li key={s._key || i}>
                      <b>{s.time || ''}</b>
                      <span>{s.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Card>
        ) : null}

        {/* shots */}
        {shots.length ? (
          <Card icon={CameraIcon} title="Shot list" count={`${done} of ${shots.length} done`}>
            <ul className="lo-sv-shots">
              {shots.map((s, i) => (
                <li key={s._key || i} data-done={s.done ? '' : undefined}>
                  <span className="lo-sv-tick" aria-hidden="true" />
                  {s.text}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {/* kit */}
        {kitRefs.length ? (
          <Card icon={KitIcon} title="Kit to bring" count={`${kitRefs.length}`}>
            <div className="lo-sv-kit">
              {kitRefs.map((r) => (
                <span key={r}>{kitNames[r] || '…'}</span>
              ))}
            </div>
          </Card>
        ) : null}

        {/* money */}
        <Card icon={PoundIcon} title="Money" wide>
          <div className="lo-sv-figs">
            <span>
              <small>Price</small>
              <b>{money(b.income)}</b>
            </span>
            <span>
              <small>Costs</small>
              <b>{money(b.costs)}</b>
            </span>
            <span data-main="" data-neg={b.profit < 0 ? '' : undefined}>
              <small>{b.profit < 0 ? 'Loss' : 'Profit'}</small>
              <b>{money(Math.abs(b.profit))}</b>
              {b.margin !== null ? <em>{percent(b.margin)} margin</em> : null}
            </span>
            <span>
              <small>{b.payState === 'paid' ? 'Paid' : 'Still to come in'}</small>
              <b>{b.payState === 'paid' ? 'In full' : money(b.outstanding)}</b>
              {b.paid && b.payState !== 'paid' ? <em>{money(b.paid)} paid</em> : null}
            </span>
          </div>
          <div className="lo-sv-money">
            <div>
              <span className="lo-sv-sub">What you’re charging</span>
              {quote.length ? (
                <ul className="lo-sv-lines">
                  {quote.map((l, i) => (
                    <li key={l._key || i}>
                      <span>
                        {l.label || 'Line'}
                        {typeof l.qty === 'number' && l.qty !== 1 ? <small> × {l.qty}</small> : null}
                      </span>
                      <b>{money(lineTotal(l))}</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lo-sv-none">No price added.</p>
              )}
            </div>
            <div>
              <span className="lo-sv-sub">Your costs</span>
              {b.items.length ? (
                <ul className="lo-sv-lines">
                  {b.items.map((it) => (
                    <li key={`${it.source}${it.key}`} data-client={it.clientPays ? '' : undefined}>
                      <span>
                        {it.label}
                        <small> · {it.clientPays ? 'client pays' : categoryTitle(it.category)}</small>
                      </span>
                      <b>{money(it.amount)}</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lo-sv-none">No costs added.</p>
              )}
              {costs.length ? null : null}
            </div>
            {payments.length ? (
              <div>
                <span className="lo-sv-sub">Payments received</span>
                <ul className="lo-sv-lines">
                  {payments.map((p, i) => (
                    <li key={p._key || i}>
                      <span>
                        {p.label || 'Payment'}
                        {p.date ? <small> · {shortDay(p.date)}</small> : null}
                      </span>
                      <b>{money(p.amount)}</b>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Card>

        {/* the brief */}
        {text(v.brief) ? (
          <Card icon={ListIcon} title="The brief">
            <p className="lo-sv-text">{v.brief}</p>
          </Card>
        ) : null}

        {/* notes from the client */}
        {notes.length ? (
          <Card icon={NoteIcon} title="Notes from the client" count={`${notes.length}`}>
            <ul className="lo-sv-notes">
              {notes.map((n, i) => (
                <li key={n._key || i}>
                  {n.date ? <small>{shortDay(n.date)}</small> : null}
                  <span>{n.text}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {/* links */}
        {links.length ? (
          <Card icon={LinkIcon} title="Links & files">
            <div className="lo-sv-links">
              {links.map((l, i) => {
                const k = LINK_KINDS.find((x) => x.value === l.kind);
                return (
                  <a key={l._key || i} href={webHref(l.url)} target="_blank" rel="noopener noreferrer">
                    <b>{l.label || (k ? k.title : 'Link')}</b>
                    <small>{String(l.url).replace(/^https?:\/\//i, '').slice(0, 48)}</small>
                  </a>
                );
              })}
            </div>
          </Card>
        ) : null}

        {/* reminders */}
        {reminders.length ? (
          <Card icon={MailIcon} title="Email reminders">
            <ul className="lo-sv-rem">
              {reminders.map((r) => (
                <li key={r.token} data-state={r.state}>
                  <b>{r.title}</b>
                  <small>
                    {r.state === 'sent' ? 'Sent' : r.state === 'missed' ? 'Too late for this one' : `${shortDay(r.due)}${days.length > 1 ? `, for ${shortDay(r.day)}` : ''}`}
                  </small>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>

      <div className="lo-sv-end">
        <button type="button" className="lo-sv-edit" data-big="" onClick={onEdit}>
          Edit shoot
        </button>
      </div>
    </div>
  );
}
