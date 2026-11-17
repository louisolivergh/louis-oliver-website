'use client';

/**
 * The shoots part of the Dashboard (sanity/components/Overview.jsx):
 * your next shoot, the next 7 days, this month's money, what's coming up, enquiries to quick book,
 * and shoots still to edit and deliver. Styles: app/studio/studio.css (".lo-dash…").
 * Shoots still being created (not saved yet) are marked, and left out of the money.
 */

import { useState } from 'react';
import { useClient } from 'sanity';
import { IntentLink, useRouter } from 'sanity/router';
import {
  addDays,
  bookingTitle,
  clientLine,
  dayInfo,
  daysBetween,
  fmtDay,
  isBooked,
  mapsUrl,
  money,
  moneyShort,
  nextStatus,
  parseYmd,
  percent,
  prevStatus,
  relDay,
  statusOf,
  tidyRange,
  timeRange,
  todayYmd,
} from '../bookingData';
import { bookShoot, declineEnquiry, setShootStatus, unbookedOf, upcomingOf } from './shootData';
import { CalendarIcon, ClockIcon, InboxIcon, KitIcon, PinIcon, PlusIcon, TruckIcon, UsersIcon } from './DashIcons';

/** money totals for a list of (saved, not cancelled) shoots */
export const totalsOf = (list) => {
  const income = list.reduce((a, b) => a + b.money.income, 0);
  const costs = list.reduce((a, b) => a + b.money.costs, 0);
  return { income, costs, profit: income - costs, count: list.length };
};
const placeOf = (b) => {
  const l = (Array.isArray(b.locations) ? b.locations : []).find((x) => x && (x.name || x.address));
  return l ? { label: l.name || l.address, q: [l.name, l.address].filter(Boolean).join(', ') } : null;
};

function Row({ b, i, right, today }) {
  const day = b.next || (b.days.length ? b.days[0] : '');
  const d = parseYmd(day);
  const st = statusOf(b.status);
  const place = placeOf(b);
  const info = day ? dayInfo(b, day) : { start: '', end: '' };
  return (
    <IntentLink intent="edit" params={{ id: b._baseId, type: 'booking' }} className="lo-ag" data-status={st.value} data-draft={isBooked(b) ? undefined : ''} style={{ '--i': i }}>
      <span className="lo-ag-date">
        {d ? (
          <>
            <b>{d.getDate()}</b>
            <small>{d.toLocaleDateString('en-GB', { month: 'short' })}</small>
          </>
        ) : (
          <small>No date</small>
        )}
      </span>
      <span className="lo-ag-main">
        <span className="lo-ag-title">{bookingTitle(b)}</span>
        <span className="lo-ag-meta">{[d ? relDay(day) : '', timeRange(info.start, info.end), place && place.label].filter(Boolean).join(' · ')}</span>
      </span>
      <span className="lo-ag-side">
        {!isBooked(b) ? (
          <span className="lo-unsaved" title="Still being created. Press Save shoot on it to book it in.">
            Not saved
          </span>
        ) : (
          right || (
            <span className="lo-ag-status" data-status={st.value}>
              {st.short}
            </span>
          )
        )}
      </span>
    </IntentLink>
  );
}

const TickMark = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.4 8.4l3.1 3L12.6 4.8" />
  </svg>
);

export function ShootsDash({ base = '/studio', data, setData }) {
  const router = useRouter();
  const client = useClient({ apiVersion: '2024-10-01' });
  const [kept, setKept] = useState([]); // moved on from here: they stay in the list (with Undo) until you leave the page
  const today = todayYmd();
  const bookings = data ? data.bookings : [];
  const counted = bookings.filter((b) => b.status !== 'cancelled' && isBooked(b));
  const upcoming = upcomingOf(bookings, today);
  const next = upcoming.find((b) => isBooked(b));
  const rest = upcoming.filter((b) => b !== next);
  const monthKey = today.slice(0, 7);
  const monthName = parseYmd(today).toLocaleDateString('en-GB', { month: 'long' });
  const lastKey = addDays(`${monthKey}-01`, -1).slice(0, 7);
  const m = totalsOf(counted.filter((b) => b.days[0] && b.days[0].slice(0, 7) === monthKey));
  const last = totalsOf(counted.filter((b) => b.days[0] && b.days[0].slice(0, 7) === lastKey));
  const all = totalsOf(counted.filter((b) => b.days[0] && b.days[0] <= today));
  const toDeliver = counted
    .filter((b) => kept.includes(b._baseId) || b.status === 'shot' || b.status === 'edited' || ((b.status === 'pencilled' || b.status === 'confirmed') && b.days.length && b.days[b.days.length - 1] < today))
    .sort((a, b) => String(a.deliveryDate || a.date || '').localeCompare(String(b.deliveryDate || b.date || '')));
  const notBooked = unbookedOf(data && data.enquiries, bookings).slice(0, 4);
  const live = bookings.filter((b) => b.status !== 'cancelled');
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d) => ({ d, list: live.filter((b) => b.days.includes(d)) }));

  const openCalendar = (e) => {
    e.preventDefault();
    router.navigateUrl({ path: `${base}/shoots` });
  };
  const scale = Math.max(m.income, m.costs, 1);
  const nextDay = next ? next.next : '';
  const nextInfo = next ? dayInfo(next, nextDay) : null;
  const place = next ? placeOf(next) : null;
  const kit = next && Array.isArray(next.kit) ? next.kit.filter(Boolean) : [];
  const crew = next && Array.isArray(next.people) ? next.people.filter(Boolean) : [];

  return (
    <section className="lo-dash" aria-label="Your shoots">
      <div className="lo-dash-head">
        <h2>Your shoots</h2>
        <a href={`${base}/shoots`} onClick={openCalendar} className="lo-dash-link">
          Open the calendar →
        </a>
      </div>

      <div className="lo-dash-grid">
        {/* next shoot */}
        <article className="lo-dash-next" data-empty={next ? undefined : ''}>
          <span className="lo-dn-rings" aria-hidden="true" />
          {next ? (
            <>
              <div className="lo-dn-top">
                <span className="lo-dn-eyebrow">
                  <span className="lo-ov-dot" /> Next shoot
                </span>
                <span className="lo-dn-when">{relDay(nextDay)}</span>
              </div>
              <h3 className="lo-dn-title">{bookingTitle(next)}</h3>
              {clientLine(next) ? <p className="lo-dn-client">{clientLine(next)}</p> : null}
              <div className="lo-dn-facts">
                <span>
                  <CalendarIcon />
                  {fmtDay(nextDay, { weekday: 'long', day: 'numeric', month: 'long' })}
                  {next.days.length > 1 ? ` · day ${next.days.indexOf(nextDay) + 1} of ${next.days.length}` : ''}
                </span>
                {nextInfo && nextInfo.start ? (
                  <span>
                    <ClockIcon />
                    {timeRange(nextInfo.start, nextInfo.end)}
                  </span>
                ) : null}
                {place ? (
                  <a href={mapsUrl(place.q)} target="_blank" rel="noopener noreferrer">
                    <PinIcon />
                    {place.label}
                  </a>
                ) : null}
                {crew.length ? (
                  <span>
                    <UsersIcon />
                    {crew.length} {crew.length === 1 ? 'person' : 'people'}
                  </span>
                ) : null}
              </div>
              {kit.length ? (
                <div className="lo-dn-kit" aria-label="Kit to bring">
                  <KitIcon />
                  {kit.slice(0, 7).map((k) => (
                    <span key={k}>{k}</span>
                  ))}
                  {kit.length > 7 ? <span>+{kit.length - 7} more</span> : null}
                </div>
              ) : null}
              <div className="lo-dn-actions">
                <IntentLink intent="edit" params={{ id: next._baseId, type: 'booking' }} className="lo-dn-btn" data-primary="">
                  Open shoot →
                </IntentLink>
                {place ? (
                  <a className="lo-dn-btn" href={mapsUrl(place.q)} target="_blank" rel="noopener noreferrer">
                    Directions ↗
                  </a>
                ) : null}
                {next.client && next.client.phone ? (
                  <a className="lo-dn-btn" href={`tel:${String(next.client.phone).replace(/[^\d+]/g, '')}`}>
                    Call {String(next.client.name || 'client').split(' ')[0]}
                  </a>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="lo-dn-top">
                <span className="lo-dn-eyebrow">Next shoot</span>
              </div>
              <h3 className="lo-dn-title">{data ? 'Nothing booked yet' : 'Loading…'}</h3>
              <p className="lo-dn-client">Book a shoot and press Save shoot. It shows up here with the date, the place, who’s coming and the kit to pack.</p>
              <div className="lo-dn-actions">
                <button type="button" className="lo-dn-btn" data-primary="" onClick={() => bookShoot(router)}>
                  <PlusIcon /> Book a shoot
                </button>
              </div>
            </>
          )}
        </article>

        {/* this month's money */}
        <article className="lo-dash-card lo-dash-money">
          <div className="lo-dc-head">
            <span className="lo-dc-title">{monthName}</span>
            <span className="lo-dc-sub">
              {m.count} shoot{m.count === 1 ? '' : 's'}
            </span>
          </div>
          <div className="lo-dm-figs">
            <div>
              <span>Booked</span>
              <b>{data ? money(m.income) : '…'}</b>
            </div>
            <div>
              <span>Costs</span>
              <b>{data ? money(m.costs) : '…'}</b>
            </div>
            <div data-main="" data-neg={m.profit < 0 ? '' : undefined}>
              <span>Profit</span>
              <b>{data ? money(m.profit) : '…'}</b>
              {m.income ? <em>{percent(m.profit / m.income)} margin</em> : null}
            </div>
          </div>
          <div className="lo-dm-bar" aria-hidden="true">
            <span style={{ width: `${(Math.min(m.costs, scale) / scale) * 100}%` }} />
            {m.profit > 0 ? <span data-profit="" style={{ width: `${(m.profit / scale) * 100}%` }} /> : null}
          </div>
          <ul className="lo-dm-rows">
            <li>
              <span>Last month</span>
              <b>{money(last.profit)} profit</b>
              <em>
                {last.count} shoot{last.count === 1 ? '' : 's'} · {money(last.income)} booked
                {last.count && m.count ? ` · this month is ${m.profit >= last.profit ? 'ahead' : 'behind'} so far` : ''}
              </em>
            </li>
            <li>
              <span>Average per shoot</span>
              <b>{all.count ? `${money(Math.round(all.profit / all.count))} profit` : 'Not yet'}</b>
              <em>{all.count ? `across ${all.count} shoot${all.count === 1 ? '' : 's'} so far · ${money(Math.round(all.income / all.count))} average price` : 'shows once you’ve done a shoot'}</em>
            </li>
          </ul>
        </article>

        {/* the next 7 days */}
        <article className="lo-dash-card lo-dash-week">
          <div className="lo-dc-head">
            <span className="lo-dc-title">Next 7 days</span>
            <span className="lo-dc-sub">{week.some((w) => w.list.length) ? `${week.reduce((a, w) => a + w.list.length, 0)} shoot days` : 'All free'}</span>
          </div>
          <div className="lo-dw">
            {week.map(({ d, list }, i) => (
              <div key={d} className="lo-dw-day" data-today={i === 0 ? '' : undefined} data-has={list.length ? '' : undefined} style={{ '--i': i }}>
                <span className="lo-dw-wd">{i === 0 ? 'Today' : fmtDay(d, { weekday: 'short' })}</span>
                <span className="lo-dw-num">{parseYmd(d).getDate()}</span>
                {list.length ? (
                  list.map((b) => {
                    const info = dayInfo(b, d);
                    return (
                      <IntentLink
                        key={b._baseId}
                        intent="edit"
                        params={{ id: b._baseId, type: 'booking' }}
                        className="lo-dw-shoot"
                        data-status={b.status}
                        data-draft={isBooked(b) ? undefined : ''}
                        title={isBooked(b) ? bookingTitle(b) : `${bookingTitle(b)} (not saved yet)`}
                      >
                        {info.start ? <small>{info.start}</small> : null}
                        {bookingTitle(b)}
                      </IntentLink>
                    );
                  })
                ) : (
                  <button type="button" className="lo-dw-free" onClick={() => bookShoot(router, { date: d })} title="Book a shoot on this day">
                    Free
                  </button>
                )}
              </div>
            ))}
          </div>
        </article>

        {/* enquiries with no shoot yet */}
        <article className="lo-dash-card lo-dash-list">
          <div className="lo-dc-head">
            <span className="lo-dc-title">Quick book</span>
            <span className="lo-dc-sub">Enquiries with no shoot</span>
          </div>
          {notBooked.length ? (
            notBooked.map((e, i) => (
              <div key={e._baseId} className="lo-enq" style={{ '--i': i }}>
                <span className="lo-enq-ic">
                  <InboxIcon />
                </span>
                <span className="lo-enq-main">
                  <span className="lo-enq-name">{[e.name, e.company].filter(Boolean).join(' · ') || 'Enquiry'}</span>
                  <span className="lo-enq-meta">{[e.service, tidyRange(e.budget), e.receivedAt ? relDay(e.receivedAt.slice(0, 10)) : ''].filter(Boolean).join(' · ')}</span>
                </span>
                <button type="button" className="lo-mini-btn" data-primary="" onClick={() => bookShoot(router, { enquiryId: e._baseId })}>
                  Book
                </button>
                {setData ? (
                  <button type="button" className="lo-enq-x" onClick={() => declineEnquiry(client, setData, e)} title="Not going ahead? Take it off this list" aria-label="Not going ahead">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                      <path d="M3 3l6 6M9 3L3 9" />
                    </svg>
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="lo-dc-empty">{data ? 'No enquiries waiting. Each has a shoot or isn’t going ahead.' : 'Loading…'}</p>
          )}
        </article>

        {/* coming up */}
        <article className="lo-dash-card lo-dash-list">
          <div className="lo-dc-head">
            <span className="lo-dc-title">Coming up</span>
            <span className="lo-dc-sub">{upcoming.length ? `${upcoming.length} in the diary` : ''}</span>
          </div>
          {rest.length ? (
            rest.slice(0, 5).map((b, i) => <Row key={b._baseId} b={b} i={i} today={today} right={b.money.income ? <span className="lo-ag-money">{moneyShort(b.money.profit)}</span> : null} />)
          ) : (
            <p className="lo-dc-empty">{next ? 'Just the one above for now.' : 'Nothing coming up yet.'}</p>
          )}
          <button type="button" className="lo-dc-add" onClick={() => bookShoot(router)}>
            <PlusIcon /> Book a shoot
          </button>
        </article>

        {/* to edit & deliver */}
        <article className="lo-dash-card lo-dash-list">
          <div className="lo-dc-head">
            <span className="lo-dc-title">To edit &amp; deliver</span>
            <span className="lo-dc-sub">{toDeliver.length ? `${toDeliver.length} shoot${toDeliver.length === 1 ? '' : 's'}` : ''}</span>
          </div>
          {toDeliver.length ? (
            toDeliver.slice(0, 5).map((b, i) => {
              const due = b.deliveryDate ? daysBetween(today, b.deliveryDate) : null;
              // where it's up to, and one tap to move it on: shot → edited → delivered
              const now = b.status === 'pencilled' || b.status === 'confirmed' ? 'booked' : b.status;
              const next = now === 'booked' ? 'shot' : nextStatus(b.status);
              const back = now === 'booked' ? null : prevStatus(b.status);
              const move = (to) => {
                setKept((k) => (k.includes(b._baseId) ? k : [...k, b._baseId]));
                setShootStatus(client, setData, b, to);
              };
              return (
                <div key={b._baseId} className="lo-dl-item">
                  <Row
                    b={b}
                    i={i}
                    today={today}
                    right={
                      <span className="lo-due" data-late={due !== null && due < 0 ? '' : undefined}>
                        <TruckIcon />
                        {due === null ? 'No due date' : due < 0 ? `${-due}d late` : due === 0 ? 'Due today' : `Due in ${due}d`}
                      </span>
                    }
                  />
                  <span className="lo-dl-acts">
                    <span className="lo-dl-now" data-status={b.status}>
                      {b.status === 'delivered' ? <TickMark /> : null}
                      {now === 'booked' ? 'Not marked as shot' : statusOf(b.status).title}
                    </span>
                    {setData ? (
                      <span className="lo-dl-btns">
                        {back ? (
                          <button type="button" className="lo-dl-back" onClick={() => move(back)} title={`Back to ${statusOf(back).short.toLowerCase()}`}>
                            {b.status === 'delivered' ? 'Undo' : 'Back'}
                          </button>
                        ) : null}
                        {next ? (
                          <button type="button" className="lo-dl-next" onClick={() => move(next)}>
                            Mark as {statusOf(next).short.toLowerCase()}
                          </button>
                        ) : null}
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="lo-dc-empty">Nothing waiting to be delivered.</p>
          )}
        </article>
      </div>
    </section>
  );
}
