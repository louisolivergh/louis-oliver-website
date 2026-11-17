'use client';

/**
 * The Shoots tab: a full calendar of your booked shoots (sanity/structure.js → shootsStructure).
 *  - nothing open → the month, plus what's coming up, shoots without a date and enquiries ready to book
 *  - List → every shoot in a table, with the money
 *  - a shoot open beside it (or a small screen) → a slim month and the agenda
 * Click a day to book a shoot on it. Drag a shoot to another day to move it.
 * Styles: app/studio/studio.css (".lo-cal…").
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'sanity/router';
import { usePaneRouter } from 'sanity/structure';
import {
  STATUSES,
  addDays,
  bookingTitle,
  clientLine,
  daysBetween,
  fmtDay,
  money,
  moneyShort,
  parseYmd,
  percent,
  relDay,
  statusOf,
  timeRange,
  todayYmd,
  ymd,
} from '../bookingData';
import { bookShoot, unbookedOf, upcomingOf, useShootData, withMoney } from './shootData';
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
const dragProps = (b) => ({
  draggable: true,
  onDragStart: (e) => {
    e.dataTransfer.setData(DND, b._baseId);
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

function AgendaRow({ b, ChildLink, active, showMoney, i = 0 }) {
  const d = parseYmd(b.date);
  const st = statusOf(b.status);
  return (
    <ChildLink childId={b._baseId} className="lo-ag" data-status={st.value} data-active={active ? '' : undefined} style={{ '--i': Math.min(i, 12) }} {...dragProps(b)}>
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
        <span className="lo-ag-meta">{[d ? relDay(b.date) : '', timeRange(b.startTime, b.endTime), placeOf(b)].filter(Boolean).join(' · ') || clientLine(b) || 'Add the details'}</span>
      </span>
      <span className="lo-ag-side">
        <span className="lo-ag-status" data-status={st.value}>
          {st.short}
        </span>
        {showMoney && (b.money.income || b.money.costs) ? <span className="lo-ag-money">{moneyShort(b.money.profit)} profit</span> : null}
      </span>
    </ChildLink>
  );
}

function Chip({ b, day, ChildLink, active }) {
  const at = b.days.indexOf(day);
  const st = statusOf(b.status);
  return (
    <ChildLink
      childId={b._baseId}
      className="lo-chip"
      data-status={st.value}
      data-active={active ? '' : undefined}
      data-cont={at > 0 ? '' : undefined}
      title={`${bookingTitle(b)} — ${st.title}${b.startTime ? ` · ${timeRange(b.startTime, b.endTime)}` : ''}${b.days.length > 1 ? ` · day ${at + 1} of ${b.days.length}` : ''}`}
      onClick={(e) => e.stopPropagation()}
      {...dragProps(b)}
    >
      {at <= 0 && b.startTime ? <span className="lo-chip-time">{b.startTime}</span> : null}
      <span className="lo-chip-title">{bookingTitle(b)}</span>
      {b.days.length > 1 ? <span className="lo-chip-day">{at + 1}/{b.days.length}</span> : null}
    </ChildLink>
  );
}

function ListView({ bookings, openId, ChildLink, today }) {
  const [filter, setFilter] = useState('upcoming');
  const rows = useMemo(() => {
    const last = (b) => (b.days.length ? b.days[b.days.length - 1] : '');
    let list = bookings;
    if (filter === 'upcoming') list = bookings.filter((b) => !b.date || last(b) >= today);
    if (filter === 'past') list = bookings.filter((b) => b.date && last(b) < today);
    return [...list].sort((a, b) =>
      filter === 'past' ? String(b.date).localeCompare(String(a.date)) : String(a.date || '9999').localeCompare(String(b.date || '9999'))
    );
  }, [bookings, filter, today]);
  const live = rows.filter((b) => b.status !== 'cancelled');
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
          <span data-num="" data-wide="">Costs</span>
          <span data-num="">Profit</span>
          <span data-num="">To come in</span>
        </div>
        {rows.length ? (
          rows.map((b, i) => {
            const st = statusOf(b.status);
            const m = b.money;
            return (
              <ChildLink key={b._baseId} childId={b._baseId} className="lo-tbl-row" data-status={st.value} data-active={openId === b._baseId ? '' : undefined} style={{ '--i': Math.min(i, 14) }}>
                <span className="lo-tbl-date">
                  {b.date ? fmtDay(b.date, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'}
                  <small>{b.date ? relDay(b.date) : 'Add a date'}</small>
                </span>
                <span className="lo-tbl-shoot">
                  <b>{bookingTitle(b)}</b>
                  <small>{clientLine(b) || '—'}</small>
                </span>
                <span className="lo-tbl-where" data-wide="">
                  {placeOf(b) || '—'}
                </span>
                <span>
                  <span className="lo-ag-status" data-status={st.value}>
                    {st.short}
                  </span>
                </span>
                <span data-num="">{m.income ? money(m.income) : '—'}</span>
                <span data-num="" data-wide="">
                  {m.costs ? money(m.costs) : '—'}
                </span>
                <span data-num="" data-neg={m.profit < 0 ? '' : undefined}>
                  <b>{m.income || m.costs ? money(m.profit) : '—'}</b>
                  {m.margin !== null ? <small>{percent(m.margin)}</small> : null}
                </span>
                <span data-num="" data-ok={m.payState === 'paid' ? '' : undefined}>
                  {m.income ? (m.payState === 'paid' ? 'Paid' : money(m.outstanding)) : '—'}
                </span>
              </ChildLink>
            );
          })
        ) : (
          <div className="lo-tbl-empty">{filter === 'past' ? 'No past shoots yet.' : 'Nothing booked yet — click “Book a shoot” to add your first.'}</div>
        )}
        {live.length ? (
          <div className="lo-tbl-foot">
            <span>Total</span>
            <span>
              {live.length} shoot{live.length === 1 ? '' : 's'}
              {rows.length !== live.length ? <small>cancelled ones not counted</small> : null}
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
  const { ChildLink } = usePaneRouter();
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

  const byDay = useMemo(() => {
    const m = new Map();
    bookings.forEach((b) => {
      b.days.forEach((d) => {
        if (!m.has(d)) m.set(d, []);
        m.get(d).push(b);
      });
    });
    m.forEach((list) =>
      list.sort(
        (a, b) =>
          (a.status === 'cancelled') - (b.status === 'cancelled') ||
          String(a.startTime || '99').localeCompare(String(b.startTime || '99')) ||
          bookingTitle(a).localeCompare(bookingTitle(b))
      )
    );
    return m;
  }, [bookings]);

  const book = (date, enquiryId) => bookShoot(router, { date, enquiryId });

  const move = (baseId, date) => {
    const b = bookings.find((x) => x._baseId === baseId);
    if (!b || !date || b.date === date) return;
    const patch = { date };
    if (b.date && parseYmd(b.endDate)) patch.endDate = addDays(b.endDate, daysBetween(b.date, date));
    setData((d) => d && { ...d, bookings: d.bookings.map((x) => (x._baseId === baseId ? withMoney({ ...x, ...patch }) : x)) });
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
      const id = e.dataTransfer.getData(DND);
      setDropDay(null);
      if (!id) return;
      e.preventDefault();
      move(id, d);
    },
  });

  const cells = useMemo(() => monthCells(month), [month]);
  const mDate = parseYmd(month);
  const monthName = mDate.toLocaleDateString('en-GB', { month: 'long' });
  const year = mDate.getFullYear();
  const thisMonth = firstOfMonth(today);

  const upcoming = upcomingOf(bookings, today);
  const undated = bookings.filter((b) => !b.date && b.status !== 'cancelled');
  const toBook = unbookedOf(enquiries, bookings).slice(0, 5);
  const inMonth = bookings
    .filter((b) => b.days.some((d) => d.slice(0, 7) === month.slice(0, 7)))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.startTime || '').localeCompare(String(b.startTime || '')));
  const scope = (view === 'month' ? inMonth.filter((b) => b.date.slice(0, 7) === month.slice(0, 7)) : upcoming).filter((b) => b.status !== 'cancelled');
  const sIncome = sumOf(scope, (b) => b.money.income);
  const sProfit = sumOf(scope, (b) => b.money.profit);
  const owed = sumOf(
    bookings.filter((b) => b.status !== 'cancelled'),
    (b) => b.money.outstanding
  );

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
          <div className="lo-mini-grid">
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
                'data-drop': dropDay === d ? '' : undefined,
              };
              const inner = (
                <>
                  <span>{parseYmd(d).getDate()}</span>
                  {list.length ? (
                    <i className="lo-mini-dots">
                      {list.slice(0, 3).map((b) => (
                        <i key={b._baseId} data-status={b.status} />
                      ))}
                    </i>
                  ) : null}
                </>
              );
              return list.length ? (
                <ChildLink
                  key={d}
                  childId={list[0]._baseId}
                  className="lo-mini-day"
                  data-has=""
                  data-active={list.some((b) => b._baseId === openId) ? '' : undefined}
                  title={list.map((b) => bookingTitle(b)).join(', ')}
                  {...flags}
                  {...dropTarget(d)}
                >
                  {inner}
                </ChildLink>
              ) : (
                <button key={d} type="button" className="lo-mini-day" onClick={() => book(d)} title={`Book a shoot on ${fmtDay(d, { weekday: 'long', day: 'numeric', month: 'long' })}`} {...flags} {...dropTarget(d)}>
                  {inner}
                </button>
              );
            })}
          </div>
        </div>
        <div className="lo-agenda">
          <span className="lo-side-label">In {monthName}</span>
          {data === null ? <p className="lo-side-empty">Loading your shoots…</p> : null}
          {data && inMonth.length
            ? inMonth.map((b, i) => <AgendaRow key={b._baseId} b={b} i={i} ChildLink={ChildLink} active={openId === b._baseId} />)
            : data
              ? <p className="lo-side-empty">No shoots in {monthName}. Tap a day above to book one.</p>
              : null}
          {undated.length ? (
            <>
              <span className="lo-side-label">Not on the calendar yet</span>
              {undated.map((b, i) => (
                <AgendaRow key={b._baseId} b={b} i={i} ChildLink={ChildLink} active={openId === b._baseId} />
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
          <Stat label={view === 'month' ? `Shoots in ${monthName}` : 'Coming up'} value={data ? scope.length : '–'} />
          <Stat label="Booked" value={data ? money(sIncome) : '–'} />
          <Stat label="Profit" value={data ? money(sProfit) : '–'} sub={sIncome ? `${percent(sProfit / sIncome)} margin` : ''} main />
          <Stat label="Still to come in" value={data ? money(owed) : '–'} sub="across all shoots" />
        </div>
      </header>

      {data && data.error ? <p className="lo-cal-error">Couldn’t load your shoots — check your connection and refresh.</p> : null}

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
                          {date.getDate()}
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
            {data && upcoming.length
              ? upcoming.slice(0, 6).map((b, i) => <AgendaRow key={b._baseId} b={b} i={i} ChildLink={ChildLink} active={openId === b._baseId} showMoney />)
              : data
                ? <p className="lo-side-empty">Nothing booked yet. Click any day to book your first shoot.</p>
                : null}
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
                <AgendaRow key={b._baseId} b={b} i={i} ChildLink={ChildLink} active={openId === b._baseId} />
              ))}
            </div>
          ) : null}

          <div className="lo-side-card">
            <span className="lo-side-label">Ready to book</span>
            {data && !toBook.length ? <p className="lo-side-empty">Every enquiry has a shoot booked — or there are none yet.</p> : null}
            {toBook.map((e, i) => (
              <div key={e._baseId} className="lo-enq" style={{ '--i': i }}>
                <span className="lo-enq-ic">
                  <InboxIcon />
                </span>
                <span className="lo-enq-main">
                  <span className="lo-enq-name">{[e.name, e.company].filter(Boolean).join(' · ') || 'Enquiry'}</span>
                  <span className="lo-enq-meta">{[e.service, e.budget, e.receivedAt ? relDay(e.receivedAt.slice(0, 10)) : ''].filter(Boolean).join(' · ')}</span>
                </span>
                <button type="button" className="lo-mini-btn" data-primary="" onClick={() => book(undefined, e._baseId)}>
                  Book
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
