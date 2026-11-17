'use client';

/**
 * The shoots part of the Dashboard (sanity/components/Overview.jsx):
 * your next shoot, the next 7 days, this month's money, what's coming up, enquiries ready to book,
 * and shoots still to edit and deliver. Styles: app/studio/studio.css (".lo-dash…").
 */

import { IntentLink, useRouter } from 'sanity/router';
import {
  addDays,
  bookingTitle,
  clientLine,
  daysBetween,
  fmtDay,
  mapsUrl,
  money,
  moneyShort,
  parseYmd,
  percent,
  relDay,
  statusOf,
  timeRange,
  todayYmd,
} from '../bookingData';
import { bookShoot, unbookedOf, upcomingOf, useShootData } from './shootData';
import { CalendarIcon, ClockIcon, InboxIcon, KitIcon, PinIcon, PlusIcon, TruckIcon, UsersIcon } from './DashIcons';

const totals = (list) => {
  const income = list.reduce((a, b) => a + b.money.income, 0);
  const costs = list.reduce((a, b) => a + b.money.costs, 0);
  return { income, costs, profit: income - costs };
};
const placeOf = (b) => {
  const l = (Array.isArray(b.locations) ? b.locations : []).find((x) => x && (x.name || x.address));
  return l ? { label: l.name || l.address, q: [l.name, l.address].filter(Boolean).join(', ') } : null;
};

function Row({ b, i, right }) {
  const d = parseYmd(b.date);
  const st = statusOf(b.status);
  const place = placeOf(b);
  return (
    <IntentLink intent="edit" params={{ id: b._baseId, type: 'booking' }} className="lo-ag" data-status={st.value} style={{ '--i': i }}>
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
        <span className="lo-ag-meta">{[d ? relDay(b.date) : '', timeRange(b.startTime, b.endTime), place && place.label].filter(Boolean).join(' · ')}</span>
      </span>
      <span className="lo-ag-side">{right || <span className="lo-ag-status" data-status={st.value}>{st.short}</span>}</span>
    </IntentLink>
  );
}

export function ShootsDash({ base = '/studio' }) {
  const router = useRouter();
  const { data } = useShootData();
  const today = todayYmd();
  const bookings = data ? data.bookings : [];
  const live = bookings.filter((b) => b.status !== 'cancelled');
  const upcoming = upcomingOf(bookings, today);
  const next = upcoming[0];
  const monthKey = today.slice(0, 7);
  const monthName = parseYmd(today).toLocaleDateString('en-GB', { month: 'long' });
  const monthList = live.filter((b) => b.date && b.date.slice(0, 7) === monthKey);
  const yearList = live.filter((b) => b.date && b.date.slice(0, 4) === today.slice(0, 4));
  const m = totals(monthList);
  const y = totals(yearList);
  const owed = live.reduce((a, b) => a + b.money.outstanding, 0);
  const toDeliver = live
    .filter((b) => b.status === 'shot' || ((b.status === 'pencilled' || b.status === 'confirmed') && b.days.length && b.days[b.days.length - 1] < today))
    .sort((a, b) => String(a.deliveryDate || a.date || '').localeCompare(String(b.deliveryDate || b.date || '')));
  const toBook = unbookedOf(data && data.enquiries, bookings).slice(0, 4);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d) => ({ d, list: live.filter((b) => b.days.includes(d)) }));

  const openCalendar = (e) => {
    e.preventDefault();
    router.navigateUrl({ path: `${base}/shoots` });
  };
  const scale = Math.max(m.income, m.costs, 1);
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
                <span className="lo-dn-when">{relDay(next.date)}</span>
              </div>
              <h3 className="lo-dn-title">{bookingTitle(next)}</h3>
              {clientLine(next) ? <p className="lo-dn-client">{clientLine(next)}</p> : null}
              <div className="lo-dn-facts">
                <span>
                  <CalendarIcon />
                  {fmtDay(next.date, { weekday: 'long', day: 'numeric', month: 'long' })}
                  {next.days.length > 1 ? ` · ${next.days.length} days` : ''}
                </span>
                {next.startTime ? (
                  <span>
                    <ClockIcon />
                    {timeRange(next.startTime, next.endTime)}
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
              <p className="lo-dn-client">Book a shoot and it shows up here — with the date, the place, who’s coming and the kit to pack.</p>
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
              {monthList.length} shoot{monthList.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="lo-dm-figs">
            <div>
              <span>Booked</span>
              <b>{data ? money(m.income) : '–'}</b>
            </div>
            <div>
              <span>Costs</span>
              <b>{data ? money(m.costs) : '–'}</b>
            </div>
            <div data-main="" data-neg={m.profit < 0 ? '' : undefined}>
              <span>Profit</span>
              <b>{data ? money(m.profit) : '–'}</b>
              {m.income ? <em>{percent(m.profit / m.income)} margin</em> : null}
            </div>
          </div>
          <div className="lo-dm-bar" aria-hidden="true">
            <span style={{ width: `${(Math.min(m.costs, scale) / scale) * 100}%` }} />
            {m.profit > 0 ? <span data-profit="" style={{ width: `${(m.profit / scale) * 100}%` }} /> : null}
          </div>
          <ul className="lo-dm-rows">
            <li>
              <span>This year so far</span>
              <b>{money(y.profit)} profit</b>
              <em>
                {yearList.length} shoot{yearList.length === 1 ? '' : 's'} · {money(y.income)} booked
              </em>
            </li>
            <li data-tone={owed ? 'warn' : 'ok'}>
              <span>Still to come in</span>
              <b>{money(owed)}</b>
              <em>{owed ? 'from clients, across all shoots' : 'Everyone’s paid up'}</em>
            </li>
          </ul>
        </article>

        {/* the next 7 days */}
        <article className="lo-dash-card lo-dash-week">
          <div className="lo-dc-head">
            <span className="lo-dc-title">Next 7 days</span>
            <span className="lo-dc-sub">{week.filter((w) => w.list.length).length ? `${week.reduce((a, w) => a + w.list.length, 0)} shoot days` : 'All free'}</span>
          </div>
          <div className="lo-dw">
            {week.map(({ d, list }, i) => (
              <div key={d} className="lo-dw-day" data-today={i === 0 ? '' : undefined} data-has={list.length ? '' : undefined} style={{ '--i': i }}>
                <span className="lo-dw-wd">{i === 0 ? 'Today' : fmtDay(d, { weekday: 'short' })}</span>
                <span className="lo-dw-num">{parseYmd(d).getDate()}</span>
                {list.length ? (
                  list.map((b) => (
                    <IntentLink key={b._baseId} intent="edit" params={{ id: b._baseId, type: 'booking' }} className="lo-dw-shoot" data-status={b.status}>
                      {b.startTime && b.date === d ? <small>{b.startTime}</small> : null}
                      {bookingTitle(b)}
                    </IntentLink>
                  ))
                ) : (
                  <button type="button" className="lo-dw-free" onClick={() => bookShoot(router, { date: d })} title="Book a shoot on this day">
                    Free
                  </button>
                )}
              </div>
            ))}
          </div>
        </article>

        {/* coming up */}
        <article className="lo-dash-card lo-dash-list">
          <div className="lo-dc-head">
            <span className="lo-dc-title">Coming up</span>
            <span className="lo-dc-sub">{upcoming.length ? `${upcoming.length} booked` : ''}</span>
          </div>
          {upcoming.length > 1 ? (
            upcoming.slice(1, 6).map((b, i) => <Row key={b._baseId} b={b} i={i} right={b.money.income ? <span className="lo-ag-money">{moneyShort(b.money.profit)}</span> : null} />)
          ) : (
            <p className="lo-dc-empty">{upcoming.length ? 'Just the one above for now.' : 'Nothing coming up yet.'}</p>
          )}
          <button type="button" className="lo-dc-add" onClick={() => bookShoot(router)}>
            <PlusIcon /> Book a shoot
          </button>
        </article>

        {/* enquiries ready to book */}
        <article className="lo-dash-card lo-dash-list">
          <div className="lo-dc-head">
            <span className="lo-dc-title">Ready to book</span>
            <span className="lo-dc-sub">Enquiries without a shoot</span>
          </div>
          {toBook.length ? (
            toBook.map((e, i) => (
              <div key={e._baseId} className="lo-enq" style={{ '--i': i }}>
                <span className="lo-enq-ic">
                  <InboxIcon />
                </span>
                <span className="lo-enq-main">
                  <span className="lo-enq-name">{[e.name, e.company].filter(Boolean).join(' · ') || 'Enquiry'}</span>
                  <span className="lo-enq-meta">{[e.service, e.budget, e.receivedAt ? relDay(e.receivedAt.slice(0, 10)) : ''].filter(Boolean).join(' · ')}</span>
                </span>
                <button type="button" className="lo-mini-btn" data-primary="" onClick={() => bookShoot(router, { enquiryId: e._baseId })}>
                  Book
                </button>
              </div>
            ))
          ) : (
            <p className="lo-dc-empty">{data ? 'Every enquiry has a shoot booked.' : 'Loading…'}</p>
          )}
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
              return (
                <Row
                  key={b._baseId}
                  b={b}
                  i={i}
                  right={
                    <span className="lo-due" data-late={due !== null && due < 0 ? '' : undefined}>
                      <TruckIcon />
                      {due === null ? 'No due date' : due < 0 ? `${-due}d late` : due === 0 ? 'Due today' : `Due in ${due}d`}
                    </span>
                  }
                />
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
