'use client';

/**
 * Updates → Clients: everyone who has booked a shoot, grouped by company (sanity/clientData.js does the grouping).
 * A list you can search, sort and filter on the left; the picked client on the right with their people
 * (every number and email they've used), their shoots, portfolio work and enquiries.
 * Styles: app/studio/studio.css (".lo-cl…").
 */

import { useEffect, useMemo, useState } from 'react';
import { useClient } from 'sanity';
import { IntentLink, useRouter } from 'sanity/router';
import { CLIENT_CATEGORIES, CLIENT_SORTS, buildClients, categoryTitle, filterClients, sortClients, unattached } from '../clientData';
import { bookingTitle, fmtDay, initials, latestById, money, relDay, statusOf, tidyRange, todayYmd } from '../bookingData';
import { bookShoot, withMoney } from './shootData';
import { CameraIcon, ChevronLeft, InboxIcon, MailIcon, PhoneIcon, PlusIcon, UsersIcon } from './DashIcons';

const QUERY = `{
  "saved": *[_type == "client"]{ _id, _createdAt, _updatedAt, name, kind, category, website, aliases, notes, addedAt, "people": people[]{ _key, name, role, emails, phones } },
  "bookings": *[_type == "booking"]{
    _id, _createdAt, _updatedAt, title, status, kind, date, endDate, startTime, endTime, deliveryDate, budgetAmount, bookedAt,
    "moreDays": moreDays[]{ _key, date, startTime, endTime, note },
    client{ name, company, email, phone, budget, "enquiry": enquiry._ref },
    "locations": locations[]{ name, address, hireFee, clientPays, paid },
    "people": people[]{ role, name, rate, rateUnit, qty, clientPays, paid },
    "costs": costs[]{ category, qty, rate, clientPays, paid },
    "quote": quote[]{ qty, rate },
    "payments": payments[]{ amount }
  },
  "enquiries": *[_type == "enquiry"]{ _id, _createdAt, name, company, email, phone, service, budget, receivedAt, replied, declined },
  "work": *[_type == "shoot"]{ _id, title, category, date, "thumb": thumbnail.asset->url }
}`;
const LISTEN = '*[_type in ["client", "booking", "enquiry", "shoot"]]';

/** your clients, kept up to date as shoots and enquiries change (also used by UpdatesHome.jsx for its menu) */
export function useClientsData() {
  const client = useClient({ apiVersion: '2024-10-01' });
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    let timer = null;
    const load = () =>
      client
        .fetch(QUERY)
        .then((res) => alive && setData(res || {}))
        .catch(() => alive && setData((d) => d || {}));
    load();
    let sub = null;
    try {
      sub = client.listen(LISTEN, {}, { visibility: 'query' }).subscribe({
        next: () => {
          clearTimeout(timer);
          timer = setTimeout(load, 700);
        },
        error: () => {},
      });
    } catch {
      sub = null;
    }
    return () => {
      alive = false;
      clearTimeout(timer);
      if (sub) sub.unsubscribe();
    };
  }, [client]);

  return useMemo(() => {
    if (!data) return { clients: [], loose: [], savedIds: [], loading: true };
    const bookings = latestById(data.bookings).map(withMoney);
    const saved = latestById(data.saved);
    const clients = buildClients({ saved, bookings, enquiries: latestById(data.enquiries), work: latestById(data.work) }, todayYmd());
    return { clients, loose: unattached(bookings), savedIds: saved.map((c) => c._baseId), loading: false };
  }, [data]);
}

/* ---------- small pieces ---------- */

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
);

const SHOWS = [
  { value: 'all', title: 'All' },
  { value: 'company', title: 'Companies' },
  { value: 'person', title: 'People' },
  { value: 'upcoming', title: 'Shoot coming up' },
  { value: 'owed', title: 'Still to pay' },
];

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
/** how long they've been a client: "3 weeks", "5 months", "2 years" */
function since(day, today) {
  const a = Date.parse(`${day}T12:00:00Z`);
  const b = Date.parse(`${today}T12:00:00Z`);
  if (!a || !b || a >= b) return 'New this week';
  const days = Math.round((b - a) / 86400000);
  if (days < 7) return plural(days, 'day', 'days');
  if (days < 60) return plural(Math.floor(days / 7), 'week', 'weeks');
  if (days < 730) return plural(Math.floor(days / 30.4), 'month', 'months');
  return plural(Math.floor(days / 365.25), 'year', 'years');
}
const shortDate = (d) => fmtDay(d, { day: 'numeric', month: 'short', year: 'numeric' });
const docId = (d) => (d._isDraft ? `drafts.${d._baseId}` : d._baseId);
const newKey = () => Math.random().toString(36).slice(2, 12);
const newId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `client-${Date.now().toString(36)}-${newKey()}`;
};

/* the line under a client's name in the list */
function listLine(c) {
  const names = c.people.map((p) => p.name).filter(Boolean);
  if (c.kind === 'company' && names.length) return names.length > 2 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : names.join(', ');
  const p = c.people[0];
  return (p && (p.emails[0] || p.phones[0])) || categoryTitle(c.category) || (c.kind === 'company' ? 'Company' : 'Person');
}
/* the figure on the right of each row, to suit how the list is sorted */
function sideLine(c, sort, today) {
  if (sort === 'newest' || sort === 'oldest') return `Added ${shortDate(c.addedAt)}`;
  if (sort === 'next') return c.nextShoot ? relDay(c.nextShoot.first) : 'Nothing booked';
  if (sort === 'recent') {
    if (c.nextShoot) {
      if (c.nextShoot.first === today) return 'Shoot today';
      if (c.nextShoot.first < today) return 'On a shoot now';
      return `Next ${fmtDay(c.nextShoot.first, { day: 'numeric', month: 'short' })}`;
    }
    if (c.lastShoot) return `Last ${fmtDay(c.lastShoot, { day: 'numeric', month: 'short' })}`;
    if (c.stats.cancelled) return 'Cancelled';
    return c.addedAt === today ? 'Added today' : `Added ${shortDate(c.addedAt)}`;
  }
  if (c.stats.earned) return money(c.stats.earned);
  return c.lastShoot ? `Last ${fmtDay(c.lastShoot, { day: 'numeric', month: 'short' })}` : c.addedAt === today ? 'Added today' : `Added ${shortDate(c.addedAt)}`;
}

function Tile({ label, value, sub, accent }) {
  return (
    <div className="lo-cl-tile" data-accent={accent ? '' : undefined}>
      <span className="lo-cl-tile-label">{label}</span>
      <b>{value}</b>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}

/* ---------- one client ---------- */

function ClientDetail({ c, onBack, onSaved, today }) {
  const client = useClient({ apiVersion: '2024-10-01' });
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const main = c.people[0] || null;

  /* save a grouped client as its own record, with everything we know about them */
  const save = async (extra = {}) => {
    setBusy(true);
    setNote('');
    try {
      const id = newId();
      await client.create({
        _id: `drafts.${id}`,
        _type: 'client',
        name: c.name,
        kind: c.kind,
        addedAt: c.addedAt,
        ...(c.otherNames.length ? { aliases: c.otherNames } : {}),
        people: c.people.map((p) => ({
          _key: newKey(),
          _type: 'person',
          ...(p.name ? { name: p.name } : {}),
          ...(p.roles[0] ? { role: p.roles[0] } : {}),
          ...(p.emails.length ? { emails: p.emails } : {}),
          ...(p.phones.length ? { phones: p.phones } : {}),
        })),
        ...extra,
      });
      onSaved(id);
    } catch {
      setNote('That didn’t save. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const pickCategory = async (value) => {
    if (!c.saved) return save(value ? { category: value } : {});
    setBusy(true);
    setNote('');
    try {
      const p = client.patch(docId(c.saved));
      await (value ? p.set({ category: value }) : p.unset(['category'])).commit();
    } catch {
      setNote('That didn’t save. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const book = () =>
    bookShoot(router, {
      client: {
        company: c.kind === 'company' ? c.name : '',
        name: main ? main.name : '',
        email: main ? main.emails[0] : '',
        phone: main ? main.phones[0] : '',
      },
    });

  const next = c.nextShoot;
  return (
    <section className="lo-cl-detail" aria-label={c.name}>
      <button type="button" className="lo-cl-back" onClick={onBack}>
        <ChevronLeft /> All clients
      </button>
      <header className="lo-cl-head">
        <span className="lo-cl-av" data-kind={c.kind} data-big="">
          {initials(c.name)}
        </span>
        <div className="lo-cl-head-main">
          <span className="lo-cl-kicker">
            {c.kind === 'company' ? 'Company' : 'Books as themselves'}
            {c.category ? ` · ${categoryTitle(c.category)}` : ''}
          </span>
          <h2 className="lo-cl-name">{c.name}</h2>
          {c.otherNames.length ? <small className="lo-cl-aka">Also booked as {c.otherNames.join(', ')}</small> : null}
        </div>
      </header>

      <div className="lo-cl-actions">
        <label className="lo-cl-catpick">
          <span>Category</span>
          <select value={c.category} onChange={(e) => pickCategory(e.target.value)} disabled={busy}>
            <option value="">Not set</option>
            {CLIENT_CATEGORIES.map((k) => (
              <option key={k.value} value={k.value}>
                {k.title}
              </option>
            ))}
          </select>
        </label>
        {c.saved ? (
          <IntentLink intent="edit" params={{ id: c.saved._baseId, type: 'client' }} className="lo-cv-btn">
            Edit details
          </IntentLink>
        ) : (
          <button type="button" className="lo-cv-btn" onClick={() => save()} disabled={busy} title="Keep them as a client record, to add notes, a website or other names">
            {busy ? 'Saving…' : 'Save as client'}
          </button>
        )}
        <button type="button" className="lo-cv-btn" data-primary="" onClick={book}>
          <PlusIcon /> Book a shoot
        </button>
      </div>
      {note ? (
        <p className="lo-cl-note" role="alert">
          {note}
        </p>
      ) : null}
      {!c.saved ? <p className="lo-cl-hint">Grouped from their shoots and enquiries. Pick a category or save them to keep notes.</p> : null}

      <div className="lo-cl-tiles">
        <Tile
          label="Shoots"
          value={c.stats.shoots}
          sub={[c.stats.done ? `${c.stats.done} done` : '', c.stats.upcoming ? `${c.stats.upcoming} coming up` : '', c.stats.cancelled ? `${c.stats.cancelled} cancelled` : ''].filter(Boolean).join(' · ')}
        />
        <Tile label="Earned" value={money(c.stats.earned)} sub={c.stats.owed > 0 ? `${money(c.stats.owed)} still to pay` : c.stats.earned > 0 ? 'All paid' : ''} accent={c.stats.owed > 0} />
        {next ? (
          <Tile label="Next shoot" value={fmtDay(next.first, { day: 'numeric', month: 'short' })} sub={relDay(next.first)} />
        ) : (
          <Tile label="Last shoot" value={c.lastShoot ? fmtDay(c.lastShoot, { day: 'numeric', month: 'short' }) : 'None yet'} sub={c.lastShoot ? relDay(c.lastShoot) : ''} />
        )}
        <Tile label="Client since" value={shortDate(c.addedAt)} sub={c.addedAt >= today ? 'Added today' : `A client for ${since(c.addedAt, today)}`} />
      </div>

      <div className="lo-cl-cards">
        <section className="lo-cl-card">
          <span className="lo-cl-card-label">
            <UsersIcon /> People <span>{c.people.length}</span>
          </span>
          {c.people.length ? (
            <ul className="lo-cl-people">
              {c.people.map((p, i) => (
                <li key={`${p.name}-${p.emails[0] || p.phones[0] || i}`} className="lo-cl-person">
                  <span className="lo-cl-av" data-small="">
                    {initials(p.name || p.emails[0] || '?')}
                  </span>
                  <span className="lo-cl-person-main">
                    <b>{p.name || 'Name not given'}</b>
                    <small>
                      {[p.roles.join(', '), p.shoots ? plural(p.shoots, 'shoot', 'shoots') : '', p.enquiries ? plural(p.enquiries, 'enquiry', 'enquiries') : ''].filter(Boolean).join(' · ') || 'Saved on the client'}
                    </small>
                    <span className="lo-cl-contacts">
                      {p.emails.map((e) => (
                        <a key={e} href={`mailto:${e}`} className="lo-cl-contact">
                          <MailIcon /> {e}
                        </a>
                      ))}
                      {p.phones.map((t) => (
                        <a key={t} href={`tel:${t.replace(/[^\d+]/g, '')}`} className="lo-cl-contact">
                          <PhoneIcon /> {t}
                        </a>
                      ))}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="lo-cl-empty">No one added yet. Edit the client to add who you deal with.</p>
          )}
        </section>

        <section className="lo-cl-card">
          <span className="lo-cl-card-label">
            <CameraIcon /> Shoots <span>{c.shoots.length}</span>
          </span>
          {c.shoots.length ? (
            <ul className="lo-cl-shoots">
              {c.shoots.map((b) => (
                <li key={b._baseId}>
                  <IntentLink intent="edit" params={{ id: b._baseId, type: 'booking' }} className="lo-cl-shoot" data-off={b.status === 'cancelled' ? '' : undefined}>
                    <span className="lo-cl-date">
                      {b.first ? (
                        <>
                          <b>{fmtDay(b.first, { day: 'numeric' })}</b>
                          <small>{fmtDay(b.first, { month: 'short', year: '2-digit' })}</small>
                        </>
                      ) : (
                        <small>No date</small>
                      )}
                    </span>
                    <span className="lo-cl-shoot-main">
                      <b>{bookingTitle(b)}</b>
                      <small>
                        {[b.client && b.client.name, b.money && b.money.income ? money(b.money.income) : '', b.first && b.last >= today ? relDay(b.first) : ''].filter(Boolean).join(' · ') || ' '}
                      </small>
                    </span>
                    {b.bookedAt ? (
                      <span className="lo-ag-status" data-status={b.status || 'pencilled'}>
                        {statusOf(b.status).short}
                      </span>
                    ) : (
                      <span className="lo-cl-tag">Not saved</span>
                    )}
                  </IntentLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="lo-cl-empty">No shoots yet. Book one and it appears here.</p>
          )}
        </section>

        {c.work.length ? (
          <section className="lo-cl-card">
            <span className="lo-cl-card-label">
              <CameraIcon /> On your website <span>{c.work.length}</span>
            </span>
            <div className="lo-cl-work">
              {c.work.map((w) => (
                <IntentLink key={w._baseId || w._id} intent="edit" params={{ id: w._baseId || w._id, type: 'shoot' }} className="lo-cl-workitem" title={w.title}>
                  {w.thumb ? <img src={`${w.thumb}?w=360&h=240&fit=crop&auto=format`} alt="" loading="lazy" /> : <span className="lo-cl-workempty"><CameraIcon /></span>}
                  <small>{[w.category, w.date ? String(w.date).slice(0, 4) : ''].filter(Boolean).join(' · ') || w.title}</small>
                </IntentLink>
              ))}
            </div>
          </section>
        ) : null}

        <section className="lo-cl-card">
          <span className="lo-cl-card-label">
            <InboxIcon /> Enquiries <span>{c.enquiries.length}</span>
          </span>
          {c.enquiries.length ? (
            <ul className="lo-cl-enqs">
              {c.enquiries.map((e) => (
                <li key={e._baseId}>
                  <IntentLink intent="edit" params={{ id: e._baseId, type: 'enquiry' }} className="lo-cl-enq">
                    <span className="lo-cl-enq-main">
                      <b>{[e.name, e.company].filter(Boolean).join(' · ') || 'Enquiry'}</b>
                      <small>{[e.service, tidyRange(e.budget)].filter(Boolean).join(' · ') || 'No details'}</small>
                    </span>
                    <span className="lo-cl-enq-side">
                      <span className="lo-cl-tag" data-done={e.replied || e.declined ? '' : undefined}>
                        {e.declined ? 'Not going ahead' : e.replied ? 'Replied' : 'To reply'}
                      </span>
                      <small>{e.receivedAt ? shortDate(e.receivedAt.slice(0, 10)) : ''}</small>
                    </span>
                  </IntentLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="lo-cl-empty">No enquiries from them through your website.</p>
          )}
        </section>

        {c.notes || c.website ? (
          <section className="lo-cl-card">
            <span className="lo-cl-card-label">Notes</span>
            {c.website ? (
              <a className="lo-cl-site" href={c.website} target="_blank" rel="noreferrer">
                {c.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')} ↗
              </a>
            ) : null}
            {c.notes ? <p className="lo-cl-notes">{c.notes}</p> : null}
          </section>
        ) : null}
      </div>

      {c.alsoSaved.length ? (
        <p className="lo-cl-hint">
          Also saved separately as{' '}
          {c.alsoSaved.map((d, i) => (
            <span key={d._baseId}>
              {i ? ', ' : ''}
              <IntentLink intent="edit" params={{ id: d._baseId, type: 'client' }}>
                {d.name || 'a client'}
              </IntentLink>
            </span>
          ))}
          . The details match, so they’re shown together here. You can delete the extra one.
        </p>
      ) : null}
    </section>
  );
}

/* ---------- the page ---------- */

const remembered = { sort: 'recent', show: 'all', category: '', q: '', open: '' };

export function ClientsPane() {
  const { clients, loose, loading } = useClientsData();
  const [sort, setSort] = useState(remembered.sort);
  const [show, setShow] = useState(remembered.show);
  const [category, setCategory] = useState(remembered.category);
  const [q, setQ] = useState(remembered.q);
  const [open, setOpen] = useState(remembered.open);
  // while a client you've just saved comes back as a saved record, keep showing them
  const [was, setWas] = useState('');
  const today = todayYmd();

  useEffect(() => {
    Object.assign(remembered, { sort, show, category, q, open });
  }, [sort, show, category, q, open]);

  const list = useMemo(() => sortClients(filterClients(clients, { show, category, q }), sort), [clients, show, category, q, sort]);
  const counts = useMemo(() => {
    const out = {};
    SHOWS.forEach((s) => {
      out[s.value] = filterClients(clients, { show: s.value }).length;
    });
    return out;
  }, [clients]);
  const usedCategories = CLIENT_CATEGORIES.filter((k) => clients.some((c) => c.category === k.value));
  const picked = clients.find((c) => c.key === open) || (was ? clients.find((c) => c.key === was) : null) || null;
  const current = picked || list[0] || null;
  const clear = () => {
    setQ('');
    setShow('all');
    setCategory('');
  };

  return (
    <div className="lo-upsec">
      <div className="lo-cv lo-cl" data-open={picked ? '' : undefined}>
        <header className="lo-cv-hero">
          <span className="lo-eyebrow">
            <span className="lo-eyebrow-dot" aria-hidden="true" />
            Clients
          </span>
          <div className="lo-cv-headrow">
            <h1 className="lo-cv-title">{loading ? 'Your clients' : clients.length ? `${plural(clients.length, 'client', 'clients')}` : 'Your clients'}</h1>
            <IntentLink intent="create" params={{ type: 'client', template: 'client' }} className="lo-cv-btn" data-primary="">
              <PlusIcon /> New client
            </IntentLink>
          </div>
          <p className="lo-cv-text">Everyone who has booked a shoot, grouped by company. People from the same company, and the same person with new details, are put together for you.</p>
        </header>

        {loading ? (
          <p className="lo-cl-loading">Gathering your clients…</p>
        ) : clients.length ? (
          <>
            <div className="lo-cl-tools">
              <label className="lo-cl-search">
                <SearchIcon />
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names, emails or numbers" aria-label="Search clients" />
              </label>
              <label className="lo-cl-sort">
                <span>Sort by</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  {CLIENT_SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="lo-cl-filters" role="group" aria-label="Show">
              {SHOWS.map((s) =>
                s.value === 'all' || counts[s.value] ? (
                  <button key={s.value} type="button" className="lo-cl-chip" aria-pressed={show === s.value} onClick={() => setShow(s.value)}>
                    {s.title}
                    <span>{counts[s.value]}</span>
                  </button>
                ) : null
              )}
              {usedCategories.length ? (
                <label className="lo-cl-catfilter">
                  <span className="lo-cl-visually-hidden">Category</span>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">All categories</option>
                    {usedCategories.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.title}
                      </option>
                    ))}
                    <option value="none">No category yet</option>
                  </select>
                </label>
              ) : null}
            </div>

            <div className="lo-cl-body">
              <div className="lo-cl-list">
                {list.length ? (
                  list.map((c, i) => (
                    <button
                      key={c.key}
                      type="button"
                      className="lo-cl-row"
                      data-active={current && current.key === c.key ? '' : undefined}
                      onClick={() => setOpen(c.key)}
                      style={{ '--i': Math.min(i, 14) }}
                    >
                      <span className="lo-cl-av" data-kind={c.kind}>
                        {initials(c.name)}
                      </span>
                      <span className="lo-cl-row-main">
                        <b>{c.name}</b>
                        <small>{listLine(c)}</small>
                      </span>
                      <span className="lo-cl-row-side">
                        <b>{plural(c.stats.shoots, 'shoot', 'shoots')}</b>
                        <small>{sideLine(c, sort, today)}</small>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="lo-cl-none">
                    <p>No clients match that.</p>
                    <button type="button" className="lo-cv-btn" onClick={clear}>
                      Show everyone
                    </button>
                  </div>
                )}
                {loose.length ? (
                  <p className="lo-cl-loose">
                    {loose.length === 1 ? 'One booked shoot has' : `${loose.length} booked shoots have`} no client details yet, so {loose.length === 1 ? 'it isn’t' : 'they aren’t'} under anyone:{' '}
                    {loose.slice(0, 3).map((b, i) => (
                      <span key={b._baseId}>
                        {i ? ', ' : ''}
                        <IntentLink intent="edit" params={{ id: b._baseId, type: 'booking' }}>
                          {bookingTitle(b)}
                        </IntentLink>
                      </span>
                    ))}
                    {loose.length > 3 ? ` and ${loose.length - 3} more` : ''}.
                  </p>
                ) : null}
              </div>
              {current ? (
                <ClientDetail
                  key={current.key}
                  c={current}
                  today={today}
                  onBack={() => {
                    setOpen('');
                    setWas('');
                  }}
                  onSaved={(id) => {
                    setWas(current.key);
                    setOpen(id);
                  }}
                />
              ) : null}
            </div>
          </>
        ) : (
          <div className="lo-cv-empty">
            <span className="lo-cv-ic">
              <UsersIcon />
            </span>
            <p>No clients yet. Anyone who books a shoot appears here, grouped by company. You can also add a client before their first booking.</p>
            <IntentLink intent="create" params={{ type: 'client', template: 'client' }} className="lo-cv-btn" data-primary="">
              <PlusIcon /> Add a client
            </IntentLink>
          </div>
        )}
      </div>
    </div>
  );
}
