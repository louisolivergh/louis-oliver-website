'use client';

/**
 * The Shoots tab: a full calendar of your booked shoots (sanity/structure.js → shootsStructure).
 *  - nothing open → the month, plus what's coming up, shoots without a date and enquiries not booked yet
 *  - List → every shoot in a table, with the money
 *  - a shoot open beside it (or a small screen) → a slim month and the agenda
 * Click a day to book a shoot on it. Drag a shoot to another day to move it.
 * Today has a dotted ring; the day(s) of the shoot you have open are filled in.
 * Shoots still being created (not saved with "Save shoot" yet) show faded, and aren't counted in the money.
 * Styles: app/studio/studio.css (".lo-cal…").
 */

import { useEffect, useMemo, useRef, useState } from 'react';
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
  money,
  moneyShort,
  nextDayOf,
  parseYmd,
  percent,
  relDay,
  STATUSES,
  statusOf,
  tidyRange,
  timeRange,
  todayYmd,
  ymd,
} from '../bookingData';
import { bookShoot, declineEnquiry, unbookedOf, upcomingOf, useShootData, withMoney } from './shootData';
import { CalendarIcon, ChevronLeft, ChevronRight, InboxIcon, ListIcon, PlusIcon } from './DashIcons';

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

export function ShootsCalendar(props) {
  const openId = String(props.childItemId || '').replace(/^__edit__/, '');
  const { ChildLink, routerPanesState } = usePaneRouter();
  const router = useRouter();
  const { data, setData, load, client } = useShootData();
  const today = todayYmd();
  const [month, setMonth] = useState(() => firstOfMonth(todayYmd()));
  const [view, setView] = useState('month');
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
  const selected = useMemo(() => new Set(openShoot && openShoot.days.length ? openShoot.days : pendingDate ? [pendingDate] : []), [openShoot, pendingDate]);

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

  const book = (date, enquiryId) => bookShoot(router, { date, enquiryId });

  /* drag a day of a shoot to another day: the first day brings any run of days with it; an extra day moves on its own */
  const move = (payload, date) => {
    const [baseId, fromDay] = String(payload).split('|');
    const b = bookings.find((x) => x._baseId === baseId);
    if (!b || !date) return;
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
      <span className="lo-side-label">Not booked yet</span>
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
              const flags = {
                'data-out': d.slice(0, 7) !== month.slice(0, 7) ? '' : undefined,
                'data-today': d === today ? '' : undefined,
                'data-selected': selected.has(d) ? '' : undefined,
                'data-drop': dropDay === d ? '' : undefined,
              };
              const inner = (
                <>
                  <span className="lo-mini-num">{parseYmd(d).getDate()}</span>
                  {list.length ? (
                    <i className="lo-mini-dots">
                      {list.slice(0, 3).map((b) => (
                        <i key={b._baseId} data-status={b.status} data-draft={isBooked(b) ? undefined : ''} />
                      ))}
                    </i>
                  ) : null}
                </>
              );
              return list.length ? (
                <ChildLink key={d} childId={list[0]._baseId} className="lo-mini-day" data-has="" title={list.map((b) => bookingTitle(b)).join(', ')} {...flags} {...dropTarget(d)}>
                  {inner}
                </ChildLink>
              ) : (
                <button
                  key={d}
                  type="button"
                  className="lo-mini-day"
                  onClick={() => book(d)}
                  title={`Book a shoot on ${fmtDay(d, { weekday: 'long', day: 'numeric', month: 'long' })}`}
                  {...flags}
                  {...dropTarget(d)}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        </div>
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
          ) : (
            <h1 className="lo-cal-title">Every shoot</h1>
          )}
          {view === 'month' ? nav : null}
        </div>
        <div className="lo-cal-stats">
          <Stat label={view === 'month' ? `Shoots in ${monthName}` : 'Coming up'} value={data ? scope.length : '…'} />
          <Stat label="Booked" value={data ? money(sIncome) : '…'} />
          <Stat label="Profit" value={data ? money(sProfit) : '…'} sub={sIncome ? `${percent(sProfit / sIncome)} margin` : ''} main />
          <Stat label="Still to come in" value={data ? money(owed) : '…'} sub="across all shoots" />
        </div>
      </header>

      {data && data.error ? <p className="lo-cal-error">Couldn’t load your shoots. Check your connection and refresh.</p> : null}

      <div className="lo-cal-body">
        <section className="lo-cal-main" aria-label={view === 'month' ? `${monthName} ${year}` : 'Every shoot'}>
          {view === 'list' ? (
            <ListView bookings={bookings} openId={openId} ChildLink={ChildLink} today={today} />
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
                  const open = expanded === d;
                  const shown = open ? list : list.slice(0, 3);
                  const more = list.length - shown.length;
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
                      onClick={() => book(d)}
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
                        {shown.map((b) => (
                          <Chip key={b._baseId} b={b} day={d} ChildLink={ChildLink} active={openId === b._baseId} />
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
                <span className="lo-legend-tip">Click a day to book a shoot · drag a shoot to move it</span>
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
