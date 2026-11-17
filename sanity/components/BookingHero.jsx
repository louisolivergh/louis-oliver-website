'use client';

/**
 * Header cards for the shoot form (styled in app/studio/studio.css, ".lo-bk…"):
 *  - BookingHero: the top of a booked shoot, when, where, who, and the money at a glance.
 *  - EnquiryActions: on an enquiry, the shoots booked from it, and a button to book one.
 */

import { useEffect, useState } from 'react';
import { useClient } from 'sanity';
import { IntentLink } from 'sanity/router';
import {
  bookingTitle,
  clientLine,
  computeBudget,
  daysBetween,
  fmtDay,
  isBooked,
  latestById,
  mapsUrl,
  money,
  percent,
  relDay,
  shootDays,
  statusOf,
  timeRange,
} from '../bookingData';
import { CalendarIcon, ClockIcon, PinIcon, PlusIcon, UserIcon } from './DashIcons';

function Fig({ label, value, sub, main, neg }) {
  return (
    <div className="lo-bk-fig" data-main={main ? '' : undefined} data-neg={neg ? '' : undefined}>
      <span className="lo-bk-fig-label">{label}</span>
      <b>{value}</b>
      {sub ? <em>{sub}</em> : null}
    </div>
  );
}

/* "Thu 19 Nov 2026", "Thu 19 to Sat 21 Nov 2026", or "Thu 19 Nov 2026 + 2 more days" */
function daysLabel(days) {
  const long = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  if (!days.length) return 'No date yet';
  if (days.length === 1) return fmtDay(days[0], long);
  const back = days.every((d, i) => i === 0 || daysBetween(days[i - 1], d) === 1);
  if (back) return `${fmtDay(days[0], { weekday: 'short', day: 'numeric' })} to ${fmtDay(days[days.length - 1], long)}`;
  return `${fmtDay(days[0], long)} + ${days.length - 1} more day${days.length > 2 ? 's' : ''}`;
}

export function BookingHero({ value, mode = 'create', onEdit, onDone }) {
  const v = value && typeof value === 'object' ? value : {};
  const b = computeBudget(v);
  const st = statusOf(v.status);
  const days = shootDays(v);
  const booked = isBooked(v);
  const when = daysLabel(days);
  const locs = Array.isArray(v.locations) ? v.locations.filter((l) => l && (l.name || l.address)) : [];
  const first = locs[0];
  const who = clientLine(v);

  return (
    <header className="lo-hero lo-bk-hero" data-creating={booked ? undefined : ''}>
      <span className="lo-hero-rings" aria-hidden="true" />
      <div className="lo-hero-row">
        <span className="lo-eyebrow" key={booked ? 'booked' : 'creating'}>
          <span className="lo-eyebrow-dot" aria-hidden="true" />
          {booked ? 'Booked shoot' : 'Creating'}
        </span>
        <span className="lo-bk-top-right">
          <span className="lo-bk-status" data-status={st.value}>
            {st.title}
          </span>
          {mode === 'summary' && onEdit ? (
            <button type="button" className="lo-bk-edit" onClick={onEdit}>
              Edit shoot
            </button>
          ) : null}
          {mode === 'edit' && onDone ? (
            <button type="button" className="lo-bk-edit" data-done="" onClick={onDone}>
              Done
            </button>
          ) : null}
        </span>
      </div>
      <h1 className="lo-hero-title">{bookingTitle(v)}</h1>

      <div className="lo-bk-meta">
        <span className="lo-bk-chip" data-empty={days.length ? undefined : ''}>
          <CalendarIcon />
          {when}
          {days.length ? <em>{relDay(days[0])}</em> : null}
        </span>
        {v.startTime ? (
          <span className="lo-bk-chip">
            <ClockIcon />
            {timeRange(v.startTime, v.endTime)}
          </span>
        ) : null}
        {first ? (
          <a className="lo-bk-chip" href={mapsUrl([first.name, first.address].filter(Boolean).join(', '))} target="_blank" rel="noopener noreferrer" title="Open in Google Maps">
            <PinIcon />
            {first.name || first.address}
            {locs.length > 1 ? <em>+{locs.length - 1} more</em> : null}
          </a>
        ) : null}
        {who ? (
          <span className="lo-bk-chip">
            <UserIcon />
            {who}
          </span>
        ) : null}
      </div>

      <div className="lo-bk-money">
        <Fig label="Price" value={money(b.income)} sub={b.budget ? `Their budget ${money(b.budget)}` : ''} />
        <Fig label="Costs" value={money(b.costs)} sub={b.items.length ? `${b.items.filter((i) => !i.clientPays).length} item${b.items.filter((i) => !i.clientPays).length === 1 ? '' : 's'}` : ''} />
        <Fig label={b.profit < 0 ? 'Loss' : 'Profit'} value={money(Math.abs(b.profit))} sub={b.margin !== null ? `${percent(b.margin)} margin` : ''} main neg={b.profit < 0} />
        <Fig
          label={b.payState === 'paid' ? 'Paid' : 'To come in'}
          value={b.payState === 'paid' ? 'In full' : money(b.outstanding)}
          sub={b.paid && b.payState !== 'paid' ? `${money(b.paid)} paid` : ''}
        />
      </div>

      <p className="lo-hero-tip">
        <span className="lo-tip-dot" aria-hidden="true" />
        {mode === 'summary'
          ? 'Private. Only you can see this. Press Edit shoot to change anything.'
          : booked
            ? 'Editing. Everything saves as you type. Press Done to go back to the summary.'
            : 'Fill in what you know, then press Save shoot at the bottom to book it in. Only you can see this.'}
      </p>
    </header>
  );
}

/* On an enquiry: what's been booked from it, and a button to book a shoot */
export function EnquiryActions({ value }) {
  const client = useClient({ apiVersion: '2024-10-01' });
  const id = String((value && value._id) || '').replace(/^drafts\./, '');
  const [list, setList] = useState(null);

  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    const load = () =>
      client
        .fetch(`*[_type == "booking" && client.enquiry._ref == $id]{ _id, title, date, status, client{ name, company } }`, { id })
        .then((res) => alive && setList(latestById(res).sort((a, b) => String(a.date || '9').localeCompare(String(b.date || '9')))))
        .catch(() => alive && setList([]));
    load();
    return () => {
      alive = false;
    };
  }, [client, id]);

  if (!id) return null;
  return (
    <div className="lo-enq-book">
      {list && list.length
        ? list.map((s) => (
            <IntentLink key={s._baseId} intent="edit" params={{ id: s._baseId, type: 'booking' }} className="lo-enq-shoot">
              <CalendarIcon />
              <span>
                {bookingTitle(s)}
                <em>
                  {s.date ? fmtDay(s.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'No date yet'} · {statusOf(s.status).title}
                </em>
              </span>
            </IntentLink>
          ))
        : null}
      <IntentLink intent="create" params={[{ type: 'booking', template: 'booking-new' }, { enquiryId: id }]} className="lo-cv-btn" data-primary="">
        <PlusIcon /> {list && list.length ? 'Book another shoot' : 'Book a shoot'}
      </IntentLink>
    </div>
  );
}
