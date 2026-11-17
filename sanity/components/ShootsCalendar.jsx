'use client';

/**
 * The Shoots tab: a full calendar of your booked shoots (sanity/structure.js → shootsStructure).
 *  - nothing open → the month, plus what's coming up, shoots without a date and enquiries not booked yet
 *  - List → every shoot in a table, with the money
 *  - a shoot open beside it (or a small screen) → a slim month and the agenda
 * Click a day to see that day: every shoot on it with its times, full schedule and place, and anything due.
 * The + on a day books a shoot on it. Drag a shoot to another day to move it.
 * Each shoot shows that day's schedule underneath, and a shoot's delivery date shows as "Due" (drag it to change it).
 * Today has a dotted ring; the day(s) of the shoot you have open are filled in.
 * Shoots still being created (not saved with "Save shoot" yet) show faded, and aren't counted in the money.
 * Styles: app/studio/studio.css (".lo-cal…").
 */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'sanity/router';
import { usePaneRouter } from 'sanity/structure';
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
  nextDayOf,
  parseYmd,
  percent,
  relDay,
  scheduleFor,
  STATUSES,
  statusOf,
  tidyRange,
  timeRange,
  todayYmd,
  ymd,
} from '../bookingData';
import { bookShoot, declineEnquiry, unbookedOf, upcomingOf, useShootData, withMoney } from './shootData';
import { CalendarIcon, ChevronLeft, ChevronRight, ClockIcon, InboxIcon, ListIcon, PlusIcon, TruckIcon } from './DashIcons';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DND = 'application/x-lo-shoot';
const firstOfMonth = (s) => `${s.slice(0, 7)}-01`;
function shiftMonth(s, n) {
  const d = parseYmd(firstOfMonth(s));
  d.setMonth(d.getMonth() + n);
  return ymd(d);
}
function monthCells(month) {
  const first = parseYmd(month);
  const offset = (first.getDay() + 6) % 7; // weeks start on Monday
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const count = Math.ceil((offset + daysIn) / 7) * 7;
  const start = addDays(month, -offset);
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}
const sumOf = (list, pick) => list.reduce((a, b) => a + pick(b), 0);
const placeOf = (b) => {
  const l = (Array.isArray(b.locations) ? b.locations : []).find((x) => x && (x.name || x.address));
  return l ? l.name || l.address : '';
};
/* you drag one day of a shoot, that day is the one that moves */
const dragProps = (b, day) => ({
  draggable: true,
  // "due" drags the delivery date
  onDragStart: (e) => {
    e.dataTransfer.setData(DND, `${b._baseId}|${day || ''}`);
    e.dataTransfer.effectAllowed = 'move';
  },
});

function Stat({ label, value, sub, main }) {
  return (
    <div className="lo-cal-stat" data-main={main ? '' : undefined}>
      <span>{label}</span>
      <b>{value}</b>
      {sub ? <em>{sub}</em> : null}
    </div>
  );
}

function Unsaved() {
  return (
    <span className="lo-unsaved" title="Still being created. Press Save shoot on it to book it in.">
      Not saved
    </span>
  );
}

function AgendaRow({ b, ChildLink, active, showMoney, i = 0, today }) {
  const day = b.date ? nextDayOf(b, today) : '';
  const d = parseYmd(day);
  const st = statusOf(b.status);
  const info = day ? dayInfo(b, day) : { start: '', end: '' };
  const more = b.days.length > 1 ? `${b.days.length} days` : '';
  return (
    <ChildLink
      childId={b._baseId}
      className="lo-ag"
      data-status={st.value}
      data-active={active ? '' : undefined}
      data-draft={isBooked(b) ? undefined : ''}
      style={{ '--i': Math.min(i, 12) }}
      {...dragProps(b, day)}
    >
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
        <span className="lo-ag-meta">{[d ? relDay(day) : '', timeRange(info.start, info.end), more, placeOf(b)].filter(Boolean).join(' · ') || clientLine(b) || 'Add the details'}</span>
      </span>
      <span className="lo-ag-side">
        {isBooked(b) ? (
          <span className="lo-ag-status" data-status={st.value}>
            {st.short}
          </span>
        ) : (
          <Unsaved />
        )}
        {showMoney && isBooked(b) && (b.money.income || b.money.costs) ? <span className="lo-ag-money">{moneyShort(b.money.profit)} profit</span> : null}
      </span>
    </ChildLink>
  );
}

function Chip({ b, day, ChildLink, active }) {
  const at = b.days.indexOf(day);
  const st = statusOf(b.status);
  const info = dayInfo(b, day);
  const draft = !isBooked(b);
  return (
    <ChildLink
      childId={b._baseId}
      className="lo-chip"
      data-status={st.value}
      data-active={active ? '' : undefined}
      data-draft={draft ? '' : undefined}
      title={`${bookingTitle(b)} · ${draft ? 'Not saved yet' : st.title}${info.start ? ` · ${timeRange(info.start, info.end)}` : ''}${b.days.length > 1 ? ` · day ${at + 1} of ${b.days.length}` : ''}${info.note ? ` · ${info.note}` : ''}`}
      onClick={(e) => e.stopPropagation()}
      {...dragProps(b, day)}
    >
      {info.start ? <span className="lo-chip-time">{info.start}</span> : null}
      <span className="lo-chip-title">{bookingTitle(b)}</span>
      {b.days.length > 1 ? (
        <span className="lo-chip-day">
          {at + 1}/{b.days.length}
        </span>
      ) : null}
    </ChildLink>
  );
}

/* a delivery date: "Due" (or "Delivered" once it's done) */
function DueChip({ b, ChildLink, active }) {
  const done = b.status === 'delivered';
  return (
    <ChildLink
      childId={b._baseId}
      className="lo-cdue"
      data-done={done ? '' : undefined}
      data-active={active ? '' : undefined}
      data-draft={isBooked(b) ? undefined : ''}
      title={`${bookingTitle(b)} · ${done ? 'delivered' : 'due to the client'}${done ? '' : '. Drag to change the date'}`}
      onClick={(e) => e.stopPropagation()}
      {...dragProps(b, 'due')}
    >
      <TruckIcon />
      <span className="lo-cdue-label">{done ? 'Delivered' : 'Due'}</span>
      <span className="lo-cdue-title">{bookingTitle(b)}</span>
    </ChildLink>
  );
}

/* that day's schedule, under the shoot */
function PlanLines({ b, lines, ChildLink }) {
  if (!lines.length) return null;
  return (
    <ChildLink childId={b._baseId} className="lo-plan" draggable={false} onClick={(e) => e.stopPropagation()} title={`${bookingTitle(b)}: the plan for the day`}>
      {lines.map((s, i) => (
        <span key={s._key || i}>
          {s.time ? <b>{s.time}</b> : null}
          <i>{s.text || 'Something planned'}</i>
        </span>
      ))}
    </ChildLink>
  );
}

/* ---------- one day: every shoot on it with its full schedule, and anything due ---------- */
function DayShoot({ b, day, ChildLink, active, i }) {
  const info = dayInfo(b, day);
  const plan = scheduleFor(b, day);
  const at = b.days.indexOf(day);
  const st = statusOf(b.status);
  const loc = (Array.isArray(b.locations) ? b.locations : []).find((l) => l && (l.name || l.address));
  const q = loc ? [loc.name, loc.address].filter(Boolean).join(', ') : '';
  const start = info.start || (plan[0] && plan[0].time) || '';
  return (
    <article className="lo-dayv-shoot" data-status={st.value} data-active={active ? '' : undefined} data-draft={isBooked(b) ? undefined : ''} data-cancelled={b.status === 'cancelled' ? '' : undefined} style={{ '--i': i }}>
      <div className="lo-dayv-time">
        <b>{start || 'Any time'}</b>
        {info.end ? <small>to {info.end}</small> : null}
      </div>
      <div className="lo-dayv-main">
        <div className="lo-dayv-head">
          <h3>{bookingTitle(b)}</h3>
          {isBooked(b) ? (
            <span className="lo-ag-status" data-status={st.value}>
              {st.short}
            </span>
          ) : (
            <Unsaved />
          )}
        </div>
        <p className="lo-dayv-meta">{[b.days.length > 1 ? `Day ${at + 1} of ${b.days.length}` : '', clientLine(b), loc ? loc.name || loc.address : ''].filter(Boolean).join(' · ') || 'No details yet'}</p>
        {info.note ? <p className="lo-dayv-note">{info.note}</p> : null}
        {plan.length ? (
          <ol className="lo-dayv-plan">
            {plan.map((s, k) => (
              <li key={s._key || k} data-untimed={s.time ? undefined : ''}>
                <b>{s.time || 'No time'}</b>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="lo-dayv-none">No schedule for this day yet. Add it on the shoot, under Plan &amp; kit.</p>
        )}
        <div className="lo-dayv-acts">
          <ChildLink childId={b._baseId} className="lo-mini-btn" data-primary="">
            Open shoot
          </ChildLink>
          {q ? (
            <a className="lo-mini-btn" href={mapsUrl(q)} target="_blank" rel="noopener noreferrer">
              Directions
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/* ---------- the day as a timeline, like Google Calendar: hours down the side, every time at its place ---------- */
const HOUR = 72; // pixels for one hour
const toMin = (t) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const fmtMin = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

function DayGrid({ day, today, shoots, dues, ChildLink, openId, onBook }) {
  const live = shoots.filter((b) => b.status !== 'cancelled');
  const off = shoots.filter((b) => b.status === 'cancelled');
  const cols = live.map((b) => {
    const info = dayInfo(b, day);
    const plan = scheduleFor(b, day);
    const timed = plan.filter((s) => toMin(s.time) !== null).map((s) => ({ ...s, at: toMin(s.time) }));
    const untimed = plan.filter((s) => toMin(s.time) === null);
    const marks = [toMin(info.start), ...timed.map((s) => s.at)].filter((x) => x !== null);
    const start = marks.length ? Math.min(...marks) : null;
    const last = timed.length ? timed[timed.length - 1].at : null;
    const set = toMin(info.end);
    const end = start === null ? null : Math.max(set !== null ? set : start + 120, last !== null ? last + 30 : 0, start + 30);
    const loc = (Array.isArray(b.locations) ? b.locations : []).find((l) => l && (l.name || l.address));
    return { b, info, timed, untimed, start, end, place: loc ? loc.name || loc.address : '' };
  });
  const placed = cols.filter((c) => c.start !== null);
  const loose = cols.filter((c) => c.start === null);
  const untimed = cols.flatMap((c) => c.untimed.map((s) => ({ s, c })));
  const from = Math.max(0, Math.floor((Math.min(8 * 60, ...placed.map((c) => c.start)) - 60) / 60) * 60);
  const to = Math.min(24 * 60, Math.ceil((Math.max(18 * 60, ...placed.map((c) => c.end)) + 60) / 60) * 60);
  const y = (m) => ((m - from) / 60) * HOUR;
  const hours = [];
  for (let h = from; h <= to; h += 60) hours.push(h);
  const nowDate = new Date();
  const nowMin = day === today ? nowDate.getHours() * 60 + nowDate.getMinutes() : null;
  const grid = { gridTemplateColumns: `repeat(${Math.max(placed.length, 1)}, minmax(0, 1fr))` };
  const nothing = !live.length && !dues.length;

  return (
    <div className="lo-dg" key={day}>
      {nothing ? (
        <div className="lo-dayv-empty">
          <b>{day < today ? 'Nothing happened on this day.' : 'Nothing booked on this day yet.'}</b>
          <button type="button" className="lo-cv-btn" data-primary="" onClick={() => onBook(day)}>
            <PlusIcon /> Book a shoot on this day
          </button>
        </div>
      ) : null}

      {dues.length || loose.length || untimed.length ? (
        <div className="lo-dg-allday">
          <span className="lo-dg-side-label">All day</span>
          <div className="lo-dg-allday-items">
            {dues.map((b) => (
              <ChildLink key={`due-${b._baseId}`} childId={b._baseId} className="lo-dg-due" data-done={b.status === 'delivered' ? '' : undefined}>
                <TruckIcon />
                {b.status === 'delivered' ? 'Delivered' : 'Due to the client'}: {bookingTitle(b)}
              </ChildLink>
            ))}
            {loose.map((c) => (
              <ChildLink key={`loose-${c.b._baseId}`} childId={c.b._baseId} className="lo-dg-loose">
                {bookingTitle(c.b)} <small>no time set</small>
              </ChildLink>
            ))}
            {untimed.map(({ s, c }, i) => (
              <ChildLink key={`${c.b._baseId}-${s._key || i}`} childId={c.b._baseId} className="lo-dg-loose" data-untimed="">
                {s.text || 'Something planned'} <small>no time set · {bookingTitle(c.b)}</small>
              </ChildLink>
            ))}
          </div>
        </div>
      ) : null}

      {placed.length ? (
        <div className="lo-dg-cal">
          <div className="lo-dg-heads" style={grid}>
            {placed.map((c) => (
              <div key={c.b._baseId} className="lo-dg-head" data-active={openId === c.b._baseId ? '' : undefined} data-draft={isBooked(c.b) ? undefined : ''}>
                <span className="lo-dg-head-top">
                  <b>{bookingTitle(c.b)}</b>
                  {isBooked(c.b) ? (
                    <span className="lo-ag-status" data-status={c.b.status}>
                      {statusOf(c.b.status).short}
                    </span>
                  ) : (
                    <Unsaved />
                  )}
                </span>
                <small>{[timeRange(c.info.start, c.info.end), c.b.days.length > 1 ? `day ${c.b.days.indexOf(day) + 1} of ${c.b.days.length}` : '', c.place].filter(Boolean).join(' · ')}</small>
                <ChildLink childId={c.b._baseId} className="lo-dg-open">
                  Open shoot
                </ChildLink>
              </div>
            ))}
          </div>
          <div className="lo-dg-body" style={{ height: y(to) }}>
            {hours.map((h) => (
              <div key={h} className="lo-dg-hour" style={{ top: y(h) }}>
                <span>{fmtMin(h)}</span>
              </div>
            ))}
            <div className="lo-dg-cols" style={grid}>
              {placed.map((c) => (
                <div key={c.b._baseId} className="lo-dg-col">
                  <ChildLink
                    childId={c.b._baseId}
                    className="lo-dg-span"
                    data-draft={isBooked(c.b) ? undefined : ''}
                    style={{ top: y(c.start), height: Math.max(24, y(c.end) - y(c.start)) }}
                    title={`${bookingTitle(c.b)} · ${fmtMin(c.start)} to ${fmtMin(c.end)}`}
                  >
                    {c.timed.length ? null : (
                      <span className="lo-dg-span-label">
                        <b>{fmtMin(c.start)}</b> {bookingTitle(c.b)}
                        {c.info.note ? <small>{c.info.note}</small> : null}
                      </span>
                    )}
                  </ChildLink>
                  {c.timed.map((s, i) => {
                    const next = c.timed[i + 1] ? c.timed[i + 1].at : c.end;
                    const top = y(s.at);
                    const height = Math.max(26, y(Math.max(next, s.at + 15)) - top - 3);
                    return (
                      <ChildLink
                        key={s._key || i}
                        childId={c.b._baseId}
                        className="lo-dg-event"
                        data-short={height < 44 ? '' : undefined}
                        data-draft={isBooked(c.b) ? undefined : ''}
                        style={{ top, height, zIndex: 2 + i }}
                        title={`${s.time} ${s.text || ''}`}
                      >
                        <b>{s.time}</b>
                        <span>{s.text || 'Something planned'}</span>
                      </ChildLink>
                    );
                  })}
                </div>
              ))}
            </div>
            {nowMin !== null && nowMin >= from && nowMin <= to ? <div className="lo-dg-now" style={{ top: y(nowMin) }} aria-label={`Now, ${fmtMin(nowMin)}`} /> : null}
          </div>
        </div>
      ) : null}

      {off.length ? <p className="lo-dayv-off">Cancelled: {off.map((b) => bookingTitle(b)).join(', ')}</p> : null}
      {!nothing ? (
        <button type="button" className="lo-cv-btn lo-dayv-add" onClick={() => onBook(day)}>
          <PlusIcon /> Book another shoot on this day
        </button>
      ) : null}
    </div>
  );
}

function DayView({ day, today, shoots, dues, ChildLink, openId, onBook, compact }) {
  if (!compact) return <DayGrid day={day} today={today} shoots={shoots} dues={dues} ChildLink={ChildLink} openId={openId} onBook={onBook} />;
  const live = shoots.filter((b) => b.status !== 'cancelled');
  const off = shoots.filter((b) => b.status === 'cancelled');
  const nothing = !live.length && !dues.length;
  return (
    <div className="lo-dayv" data-compact={compact ? '' : undefined} key={day}>
      {nothing ? (
        <div className="lo-dayv-empty">
          <b>{day < today ? 'Nothing happened on this day.' : 'Nothing booked on this day yet.'}</b>
          <button type="button" className="lo-cv-btn" data-primary="" onClick={() => onBook(day)}>
            <PlusIcon /> Book a shoot on this day
          </button>
        </div>
      ) : null}
      {live.map((b, i) => (
        <DayShoot key={b._baseId} b={b} day={day} i={i} ChildLink={ChildLink} active={openId === b._baseId} />
      ))}
      {dues.map((b, i) => (
        <ChildLink key={`due-${b._baseId}`} childId={b._baseId} className="lo-dayv-due" data-done={b.status === 'delivered' ? '' : undefined} style={{ '--i': live.length + i }}>
          <TruckIcon />
          <span>
            <b>{b.status === 'delivered' ? 'Delivered' : 'Due to the client today'}</b>
            <small>{bookingTitle(b)}</small>
          </span>
        </ChildLink>
      ))}
      {off.length ? <p className="lo-dayv-off">Cancelled: {off.map((b) => bookingTitle(b)).join(', ')}</p> : null}
      {!nothing ? (
        <button type="button" className="lo-cv-btn lo-dayv-add" onClick={() => onBook(day)}>
          <PlusIcon /> Book another shoot on this day
        </button>
      ) : null}
    </div>
  );
}

function ListView({ bookings, openId, ChildLink, today }) {
  const [filter, setFilter] = useState('upcoming');
  const rows = useMemo(() => {
    const last = (b) => (b.days.length ? b.days[b.days.length - 1] : '');
    let list = bookings;
    if (filter === 'upcoming') list = bookings.filter((b) => !b.days.length || last(b) >= today);
    if (filter === 'past') list = bookings.filter((b) => b.days.length && last(b) < today);
    const key = (b) => (filter === 'past' ? last(b) : b.days.length ? nextDayOf(b, today) : '9999');
    return [...list].sort((a, b) => (filter === 'past' ? key(b).localeCompare(key(a)) : key(a).localeCompare(key(b))));
  }, [bookings, filter, today]);
  const live = rows.filter((b) => b.status !== 'cancelled' && isBooked(b));
  const tot = {
    income: sumOf(live, (b) => b.money.income),
    costs: sumOf(live, (b) => b.money.costs),
    profit: sumOf(live, (b) => b.money.profit),
    outstanding: sumOf(live, (b) => b.money.outstanding),
  };
  return (
    <div className="lo-tbl">
      <div className="lo-tbl-bar">
        <div className="lo-seg" role="tablist" aria-label="Which shoots">
          {[
            ['upcoming', 'Upcoming'],
            ['past', 'Past'],
            ['all', 'All'],
          ].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={filter === id} data-on={filter === id ? '' : undefined} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
        <span className="lo-tbl-count">
          {rows.length} shoot{rows.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="lo-tbl-scroll">
        <div className="lo-tbl-head">
          <span>Date</span>
          <span>Shoot</span>
          <span data-wide="">Where</span>
          <span>Status</span>
          <span data-num="">Price</span>
          <span data-num="" data-wide="">
            Costs
          </span>
          <span data-num="">Profit</span>
          <span data-num="">To come in</span>
        </div>
        {rows.length ? (
          rows.map((b, i) => {
            const st = statusOf(b.status);
            const m = b.money;
            const day = b.days.length ? nextDayOf(b, today) : '';
            return (
              <ChildLink
                key={b._baseId}
                childId={b._baseId}
                className="lo-tbl-row"
                data-status={st.value}
                data-active={openId === b._baseId ? '' : undefined}
                data-draft={isBooked(b) ? undefined : ''}
                style={{ '--i': Math.min(i, 14) }}
              >
                <span className="lo-tbl-date">
                  {day ? fmtDay(day, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'}
                  <small>{day ? `${relDay(day)}${b.days.length > 1 ? ` · ${b.days.length} days` : ''}` : 'Add a date'}</small>
                </span>
                <span className="lo-tbl-shoot">
                  <b>{bookingTitle(b)}</b>
                  <small>{clientLine(b) || 'No client yet'}</small>
                </span>
                <span className="lo-tbl-where" data-wide="">
                  {placeOf(b) || <span className="lo-tbl-none">No location yet</span>}
                </span>
                <span>
                  {isBooked(b) ? (
                    <span className="lo-ag-status" data-status={st.value}>
                      {st.short}
                    </span>
                  ) : (
                    <Unsaved />
                  )}
                </span>
                <span data-num="">{m.income ? money(m.income) : <span className="lo-tbl-none">No price</span>}</span>
                <span data-num="" data-wide="">
                  {m.costs ? money(m.costs) : <span className="lo-tbl-none">None</span>}
                </span>
                <span data-num="" data-neg={m.profit < 0 ? '' : undefined}>
                  {m.income || m.costs ? <b>{money(m.profit)}</b> : null}
                  {m.margin !== null ? <small>{percent(m.margin)}</small> : null}
                </span>
                <span data-num="" data-ok={m.payState === 'paid' ? '' : undefined}>
                  {m.income ? (m.payState === 'paid' ? 'Paid' : money(m.outstanding)) : null}
                </span>
              </ChildLink>
            );
          })
        ) : (
          <div className="lo-tbl-empty">{filter === 'past' ? 'No past shoots yet.' : 'Nothing booked yet. Click “Book a shoot” to add your first.'}</div>
        )}
        {live.length ? (
          <div className="lo-tbl-foot">
            <span>Total</span>
            <span>
              {live.length} shoot{live.length === 1 ? '' : 's'}
              {rows.length !== live.length ? <small>cancelled and unsaved ones not counted</small> : null}
            </span>
            <span data-wide="" />
            <span />
            <span data-num="">{money(tot.income)}</span>
            <span data-num="" data-wide="">
              {money(tot.costs)}
            </span>
            <span data-num="" data-neg={tot.profit < 0 ? '' : undefined}>
              <b>{money(tot.profit)}</b>
              {tot.income ? <small>{percent(tot.profit / tot.income)}</small> : null}
            </span>
            <span data-num="">{money(tot.outstanding)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const remembered = { view: '', day: '' };

export function ShootsCalendar(props) {
  const openId = String(props.childItemId || '').replace(/^__edit__/, '');
  const { ChildLink, routerPanesState } = usePaneRouter();
  const router = useRouter();
  const { data, setData, load, client } = useShootData();
  const today = todayYmd();
  const [view, setView] = useState(() => remembered.view || 'month');
  const [day, setDay] = useState(() => remembered.day || todayYmd());
  const [month, setMonth] = useState(() => firstOfMonth(remembered.view === 'day' && remembered.day ? remembered.day : todayYmd()));
  useEffect(() => {
    remembered.view = view;
    remembered.day = day;
  }, [view, day]);
  const [wide, setWide] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [dropDay, setDropDay] = useState(null);
  const rootRef = useRef(null);

  /* the full calendar when there's room */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0] && entries[0].contentRect.width;
      if (w) setWide(w >= 760);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const bookings = useMemo(() => (data ? data.bookings : []), [data]);
  const enquiries = data ? data.enquiries : [];
  const mode = openId || !wide ? 'side' : 'full';

  /* the day(s) you've got open: the open shoot's days, or the day you clicked for a new one */
  const openPane = Array.isArray(routerPanesState) && Array.isArray(routerPanesState[0]) ? routerPanesState[0][0] : null;
  const pendingDate = openPane && openPane.payload && typeof openPane.payload.date === 'string' ? openPane.payload.date : '';
  const openShoot = openId ? bookings.find((b) => b._baseId === openId) : null;
  const selected = useMemo(
    () => new Set(openShoot && openShoot.days.length ? openShoot.days : pendingDate ? [pendingDate] : view === 'day' ? [day] : []),
    [openShoot, pendingDate, view, day]
  );

  /* jump to the month of the shoot you open */
  const firstSelected = [...selected][0] || '';
  useEffect(() => {
    if (firstSelected) setMonth(firstOfMonth(firstSelected));
  }, [firstSelected]);

  const byDay = useMemo(() => {
    const m = new Map();
    bookings.forEach((b) => {
      b.days.forEach((d) => {
        if (!m.has(d)) m.set(d, []);
        m.get(d).push(b);
      });
    });
    m.forEach((list, d) =>
      list.sort(
        (a, b) =>
          (a.status === 'cancelled') - (b.status === 'cancelled') ||
          String(dayInfo(a, d).start || '99').localeCompare(String(dayInfo(b, d).start || '99')) ||
          bookingTitle(a).localeCompare(bookingTitle(b))
      )
    );
    return m;
  }, [bookings]);

  const dueByDay = useMemo(() => {
    const m = new Map();
    bookings.forEach((b) => {
      if (b.status === 'cancelled' || !parseYmd(b.deliveryDate)) return;
      const d = b.deliveryDate.slice(0, 10);
      if (!m.has(d)) m.set(d, []);
      m.get(d).push(b);
    });
    return m;
  }, [bookings]);

  const book = (date, enquiryId) => bookShoot(router, { date, enquiryId });
  /* click a date: that day, with its full schedule (a shoot open beside the calendar closes to make room) */
  const openDay = (d) => {
    setDay(d);
    setView('day');
    setMonth(firstOfMonth(d));
    setExpanded(null);
    if (openId || pendingDate) {
      const base = typeof window !== 'undefined' && window.location.pathname.startsWith('/studio') ? '/studio' : '';
      router.navigateUrl({ path: `${base}/shoots` });
    }
  };
  const dayShoots = byDay.get(day) || [];
  const dayDues = dueByDay.get(day) || [];
  const dayLive = dayShoots.filter((x) => x.status !== 'cancelled');
  const dayTimes = dayLive.flatMap((x) => {
    const info = dayInfo(x, day);
    return [info.start, info.end, ...scheduleFor(x, day).map((s) => s.time)].filter((t) => /^\d{2}:\d{2}$/.test(String(t || '')));
  });
  const dayFirst = dayTimes.length ? [...dayTimes].sort()[0] : '';
  const dayWrap = dayLive.map((x) => dayInfo(x, day).end).filter(Boolean).sort().pop() || '';

  /* drag a day of a shoot to another day: the first day brings any run of days with it; an extra day moves on its own */
  const move = (payload, date) => {
    const [baseId, fromDay] = String(payload).split('|');
    const b = bookings.find((x) => x._baseId === baseId);
    if (!b || !date) return;
    if (fromDay === 'due') {
      if (b.deliveryDate === date) return;
      setData((d) => d && { ...d, bookings: d.bookings.map((x) => (x._baseId === baseId ? withMoney({ ...x, deliveryDate: date }) : x)) });
      client
        .patch(b._id)
        .set({ deliveryDate: date })
        .commit()
        .catch(() => load());
      return;
    }
    const extra = fromDay && fromDay !== b.date ? (Array.isArray(b.moreDays) ? b.moreDays : []).find((d) => d && d.date === fromDay) : null;
    let patch;
    let local;
    if (extra) {
      if (extra.date === date) return;
      patch = { [`moreDays[_key=="${extra._key}"].date`]: date };
      local = { moreDays: b.moreDays.map((d) => (d._key === extra._key ? { ...d, date } : d)) };
    } else {
      if (b.date === date) return;
      patch = { date };
      if (b.date && parseYmd(b.endDate)) patch.endDate = addDays(b.endDate, daysBetween(b.date, date));
      local = patch;
    }
    setData((d) => d && { ...d, bookings: d.bookings.map((x) => (x._baseId === baseId ? withMoney({ ...x, ...local }) : x)) });
    client
      .patch(b._id)
      .set(patch)
      .commit()
      .catch(() => load());
  };
  const dropTarget = (d) => ({
    onDragOver: (e) => {
      if (!Array.from(e.dataTransfer.types || []).includes(DND)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dropDay !== d) setDropDay(d);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDropDay((x) => (x === d ? null : x));
    },
    onDrop: (e) => {
      const payload = e.dataTransfer.getData(DND);
      setDropDay(null);
      if (!payload) return;
      e.preventDefault();
      move(payload, d);
    },
  });

  const cells = useMemo(() => monthCells(month), [month]);
  const mDate = parseYmd(month);
  const monthName = mDate.toLocaleDateString('en-GB', { month: 'long' });
  const year = mDate.getFullYear();
  const thisMonth = firstOfMonth(today);

  const upcoming = upcomingOf(bookings, today);
  const undated = bookings.filter((b) => !b.days.length && b.status !== 'cancelled');
  const notBooked = unbookedOf(enquiries, bookings).slice(0, 5);
  const inMonth = bookings
    .filter((b) => b.days.some((d) => d.slice(0, 7) === month.slice(0, 7)))
    .map((b) => ({ ...b, first: b.days.find((d) => d.slice(0, 7) === month.slice(0, 7)) }))
    .sort((a, b) => a.first.localeCompare(b.first) || String(a.startTime || '').localeCompare(String(b.startTime || '')));
  const counted = (b) => b.status !== 'cancelled' && isBooked(b);
  const scope = (view === 'month' ? inMonth.filter((b) => b.days[0].slice(0, 7) === month.slice(0, 7)) : upcoming).filter(counted);
  const sIncome = sumOf(scope, (b) => b.money.income);
  const sProfit = sumOf(scope, (b) => b.money.profit);
  const owed = sumOf(bookings.filter(counted), (b) => b.money.outstanding);

  const nav = (
    <div className="lo-cal-nav">
      <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
        <ChevronLeft />
      </button>
      <button type="button" data-today="" onClick={() => setMonth(thisMonth)} disabled={month === thisMonth}>
        Today
      </button>
      <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
        <ChevronRight />
      </button>
    </div>
  );

  const notBookedCard = (
    <div className="lo-side-card">
      <span className="lo-side-label">Quick book</span>
      {data && !notBooked.length ? <p className="lo-side-empty">No enquiries waiting. Every one has a shoot or isn’t going ahead.</p> : null}
      {notBooked.map((e, i) => (
        <div key={e._baseId} className="lo-enq" style={{ '--i': i }}>
          <span className="lo-enq-ic">
            <InboxIcon />
          </span>
          <span className="lo-enq-main">
            <span className="lo-enq-name">{[e.name, e.company].filter(Boolean).join(' · ') || 'Enquiry'}</span>
            <span className="lo-enq-meta">{[e.service, tidyRange(e.budget), e.receivedAt ? relDay(e.receivedAt.slice(0, 10)) : ''].filter(Boolean).join(' · ')}</span>
          </span>
          <button type="button" className="lo-mini-btn" data-primary="" onClick={() => book(undefined, e._baseId)}>
            Book
          </button>
          <button type="button" className="lo-enq-x" onClick={() => declineEnquiry(client, setData, e)} title="Not going ahead? Take it off this list" aria-label="Not going ahead">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M3 3l6 6M9 3L3 9" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );

  /* ---------- slim: a shoot is open beside it, or the screen is small ---------- */
  if (mode === 'side') {
    return (
      <div className="lo-cal" data-mode="side" data-open={openId ? '' : undefined} ref={rootRef}>
        <button type="button" className="lo-cv-btn lo-side-new" data-primary="" onClick={() => book()}>
          <PlusIcon /> Book a shoot
        </button>
        <div className="lo-mini">
          <div className="lo-mini-head">
            <span className="lo-mini-title">
              {monthName} <span>{year}</span>
            </span>
            {nav}
          </div>
          <div className="lo-mini-grid" key={month}>
            {WEEKDAYS.map((w) => (
              <span key={w} className="lo-mini-wd">
                {w[0]}
              </span>
            ))}
            {cells.map((d) => {
              const list = (byDay.get(d) || []).filter((b) => b.status !== 'cancelled');
              const dues = dueByDay.get(d) || [];
              const first = list[0] || dues[0];
              const flags = {
                'data-out': d.slice(0, 7) !== month.slice(0, 7) ? '' : undefined,
                'data-today': d === today ? '' : undefined,
                'data-selected': selected.has(d) ? '' : undefined,
                'data-drop': dropDay === d ? '' : undefined,
              };
              const inner = (
                <>
                  <span className="lo-mini-num">{parseYmd(d).getDate()}</span>
                  {list.length || dues.length ? (
                    <i className="lo-mini-dots">
                      {list.slice(0, 3).map((b) => (
                        <i key={b._baseId} data-status={b.status} data-draft={isBooked(b) ? undefined : ''} />
                      ))}
                      {dues.length && list.length < 3 ? <i data-due="" /> : null}
                    </i>
                  ) : null}
                </>
              );
              return (
                <button
                  key={d}
                  type="button"
                  className="lo-mini-day"
                  data-has={first ? '' : undefined}
                  onClick={() => openDay(d)}
                  title={
                    first
                      ? [...list.map((b) => bookingTitle(b)), ...dues.map((b) => `Due: ${bookingTitle(b)}`)].join(', ')
                      : `See ${fmtDay(d, { weekday: 'long', day: 'numeric', month: 'long' })}`
                  }
                  {...flags}
                  {...dropTarget(d)}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        </div>
        {view === 'day' ? (
          <div className="lo-agenda">
            <div className="lo-side-dayhead">
              <span className="lo-side-label">{fmtDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <button type="button" className="lo-side-more" onClick={() => setView('month')}>
                Whole month
              </button>
            </div>
            <DayView day={day} today={today} shoots={dayShoots} dues={dayDues} ChildLink={ChildLink} openId={openId} onBook={book} compact />
          </div>
        ) : (
        <div className="lo-agenda">
          <span className="lo-side-label">In {monthName}</span>
          {data === null ? <p className="lo-side-empty">Loading your shoots…</p> : null}
          {data && inMonth.length ? (
            inMonth.map((b, i) => <AgendaRow key={b._baseId} b={b} i={i} today={today} ChildLink={ChildLink} active={openId === b._baseId} />)
          ) : data ? (
            <p className="lo-side-empty">No shoots in {monthName}. Tap a day above to book one.</p>
          ) : null}
          {undated.length ? (
            <>
              <span className="lo-side-label">Not on the calendar yet</span>
              {undated.map((b, i) => (
                <AgendaRow key={b._baseId} b={b} i={i} today={today} ChildLink={ChildLink} active={openId === b._baseId} />
              ))}
            </>
          ) : null}
        </div>
        )}
      </div>
    );
  }

  /* ---------- full calendar ---------- */
  return (
    <div className="lo-cal" data-mode="full" ref={rootRef}>
      <header className="lo-cal-hero">
        <span className="lo-hero-rings" aria-hidden="true" />
        <div className="lo-cal-row">
          <span className="lo-eyebrow">
            <span className="lo-eyebrow-dot" aria-hidden="true" />
            Shoots
          </span>
          <div className="lo-cal-tools">
            <div className="lo-seg" role="tablist" aria-label="View">
              <button type="button" role="tab" aria-selected={view === 'month'} data-on={view === 'month' ? '' : undefined} onClick={() => setView('month')}>
                <CalendarIcon /> Month
              </button>
              <button type="button" role="tab" aria-selected={view === 'day'} data-on={view === 'day' ? '' : undefined} onClick={() => openDay(day)}>
                <ClockIcon /> Day
              </button>
              <button type="button" role="tab" aria-selected={view === 'list'} data-on={view === 'list' ? '' : undefined} onClick={() => setView('list')}>
                <ListIcon /> List
              </button>
            </div>
            <button type="button" className="lo-cv-btn" data-primary="" onClick={() => book()}>
              <PlusIcon /> Book a shoot
            </button>
          </div>
        </div>
        <div className="lo-cal-row" data-title="">
          {view === 'month' ? (
            <h1 className="lo-cal-title" key={month}>
              {monthName} <span>{year}</span>
            </h1>
          ) : view === 'day' ? (
            <h1 className="lo-cal-title" key={day}>
              {fmtDay(day, { weekday: 'long', day: 'numeric', month: 'long' })} <span>{day.slice(0, 4)}</span>
            </h1>
          ) : (
            <h1 className="lo-cal-title">Every shoot</h1>
          )}
          {view === 'month' ? nav : null}
          {view === 'day' ? (
            <div className="lo-cal-nav">
              <button type="button" onClick={() => openDay(addDays(day, -1))} aria-label="Previous day">
                <ChevronLeft />
              </button>
              <button type="button" data-today="" onClick={() => openDay(today)} disabled={day === today}>
                Today
              </button>
              <button type="button" onClick={() => openDay(addDays(day, 1))} aria-label="Next day">
                <ChevronRight />
              </button>
            </div>
          ) : null}
        </div>
        {view === 'day' ? (
          <div className="lo-cal-stats">
            <Stat label={day === today ? 'Shoots today' : 'Shoots that day'} value={data ? dayLive.length : '…'} main />
            <Stat label="First call" value={data ? dayFirst || 'Not set' : '…'} sub={dayFirst ? 'earliest time planned' : ''} />
            <Stat label="Wrap" value={data ? dayWrap || 'Not set' : '…'} sub={dayWrap ? 'latest finish' : ''} />
            <Stat label="Due to clients" value={data ? dayDues.length : '…'} sub={dayDues.length ? dayDues.map((b) => bookingTitle(b)).join(', ') : ''} />
          </div>
        ) : (
        <div className="lo-cal-stats">
          <Stat label={view === 'month' ? `Shoots in ${monthName}` : 'Coming up'} value={data ? scope.length : '…'} />
          <Stat label="Booked" value={data ? money(sIncome) : '…'} />
          <Stat label="Profit" value={data ? money(sProfit) : '…'} sub={sIncome ? `${percent(sProfit / sIncome)} margin` : ''} main />
          <Stat label="Still to come in" value={data ? money(owed) : '…'} sub="across all shoots" />
        </div>
        )}
      </header>

      {data && data.error ? <p className="lo-cal-error">Couldn’t load your shoots. Check your connection and refresh.</p> : null}

      <div className="lo-cal-body">
        <section className="lo-cal-main" aria-label={view === 'month' ? `${monthName} ${year}` : 'Every shoot'}>
          {view === 'list' ? (
            <ListView bookings={bookings} openId={openId} ChildLink={ChildLink} today={today} />
          ) : view === 'day' ? (
            <DayView day={day} today={today} shoots={dayShoots} dues={dayDues} ChildLink={ChildLink} openId={openId} onBook={book} />
          ) : (
            <div className="lo-month" key={month}>
              <div className="lo-month-wd">
                {WEEKDAYS.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
              <div className="lo-month-grid" style={{ '--rows': cells.length / 7 }}>
                {cells.map((d, i) => {
                  const list = byDay.get(d) || [];
                  const dues = dueByDay.get(d) || [];
                  const open = expanded === d;
                  const shown = open ? list : list.slice(0, 3);
                  // the plan for the day under each shoot: a few lines when it's closed, all of it when it's open
                  const cap = open ? Infinity : shown.length > 1 ? 2 : 4;
                  const plans = shown.map((b) => {
                    const all = b.status === 'cancelled' ? [] : scheduleFor(b, d);
                    return { b, lines: all.slice(0, cap), hidden: Math.max(0, all.length - cap) };
                  });
                  const duesShown = open ? dues : dues.slice(0, Math.max(1, 3 - shown.length));
                  const more = list.length - shown.length + (dues.length - duesShown.length) + plans.reduce((a, p) => a + p.hidden, 0);
                  const date = parseYmd(d);
                  const wd = (date.getDay() + 6) % 7;
                  return (
                    <div
                      key={d}
                      className="lo-day"
                      data-out={d.slice(0, 7) !== month.slice(0, 7) ? '' : undefined}
                      data-today={d === today ? '' : undefined}
                      data-selected={selected.has(d) ? '' : undefined}
                      data-past={d < today ? '' : undefined}
                      data-weekend={wd > 4 ? '' : undefined}
                      data-drop={dropDay === d ? '' : undefined}
                      data-open={open ? '' : undefined}
                      style={{ '--i': i }}
                      onClick={() => openDay(d)}
                      title={`See ${fmtDay(d, { weekday: 'long', day: 'numeric', month: 'long' })}`}
                      {...dropTarget(d)}
                    >
                      <div className="lo-day-top">
                        <span className="lo-day-num">
                          <span className="lo-day-n">{date.getDate()}</span>
                          {date.getDate() === 1 ? <small>{date.toLocaleDateString('en-GB', { month: 'short' })}</small> : null}
                        </span>
                        <button
                          type="button"
                          className="lo-day-add"
                          onClick={(e) => {
                            e.stopPropagation();
                            book(d);
                          }}
                          aria-label={`Book a shoot on ${fmtDay(d, { weekday: 'long', day: 'numeric', month: 'long' })}`}
                          title="Book a shoot on this day"
                        >
                          <PlusIcon />
                        </button>
                      </div>
                      <div className="lo-day-chips">
                        {plans.map(({ b, lines }) => (
                          <Fragment key={b._baseId}>
                            <Chip b={b} day={d} ChildLink={ChildLink} active={openId === b._baseId} />
                            <PlanLines b={b} lines={lines} ChildLink={ChildLink} />
                          </Fragment>
                        ))}
                        {duesShown.map((b) => (
                          <DueChip key={`due-${b._baseId}`} b={b} ChildLink={ChildLink} active={openId === b._baseId} />
                        ))}
                        {more > 0 || open ? (
                          <button
                            type="button"
                            className="lo-day-more"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpanded(open ? null : d);
                            }}
                          >
                            {open ? 'Show less' : `+${more} more`}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="lo-legend">
                {STATUSES.map((s) => (
                  <span key={s.value} data-status={s.value}>
                    <i />
                    {s.title}
                  </span>
                ))}
                <span data-due="">
                  <i />
                  Due to the client
                </span>
                <span className="lo-legend-tip">Click a day to see it · + books a shoot · drag a shoot or due date to move it</span>
              </div>
            </div>
          )}
        </section>

        <aside className="lo-cal-side">
          <div className="lo-side-card">
            <span className="lo-side-label">Coming up</span>
            {data === null ? <p className="lo-side-empty">Loading…</p> : null}
            {data && upcoming.length ? (
              upcoming.slice(0, 6).map((b, i) => <AgendaRow key={b._baseId} b={b} i={i} today={today} ChildLink={ChildLink} active={openId === b._baseId} showMoney />)
            ) : data ? (
              <p className="lo-side-empty">Nothing booked yet. Click any day to book your first shoot.</p>
            ) : null}
            {upcoming.length > 6 ? (
              <button type="button" className="lo-side-more" onClick={() => setView('list')}>
                See all {upcoming.length} →
              </button>
            ) : null}
          </div>

          {undated.length ? (
            <div className="lo-side-card">
              <span className="lo-side-label">Not on the calendar yet</span>
              <p className="lo-side-hint">Drag one onto a day, or open it to add a date.</p>
              {undated.map((b, i) => (
                <AgendaRow key={b._baseId} b={b} i={i} today={today} ChildLink={ChildLink} active={openId === b._baseId} />
              ))}
            </div>
          ) : null}

          {notBookedCard}
        </aside>
      </div>
    </div>
  );
}
