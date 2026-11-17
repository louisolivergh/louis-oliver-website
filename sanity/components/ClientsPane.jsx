'use client';

/**
 * Updates → Clients: the companies you shoot for (sanity/clientData.js finds and groups them).
 * The list on the left is companies only. The open company, on the right, has its details, its
 * people, shoots, portfolio work and enquiries. Each person there (a client) opens on their own page
 * from the company, with their own details, shoots and enquiries.
 * Styles: app/studio/studio.css (".lo-cl…").
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useClient } from 'sanity';
import { IntentLink, useRouter } from 'sanity/router';
import { CLIENT_CATEGORIES, CLIENT_SORTS, buildClients, categoryTitle, filterClients, savedRecords, sortClients, unattached } from '../clientData';
import { bookingTitle, fmtDay, initials, latestById, money, relDay, statusOf, tidyRange, todayYmd } from '../bookingData';
import { bookShoot, withMoney } from './shootData';
import { CLIENTS_API, addPersonTo, createClient, ensureCompany, mergeClients, mergeCompanies, tidyLegacyPerson } from './clientRecords';
import { CameraIcon, ChevronLeft, ChevronRight, InboxIcon, MailIcon, MergeIcon, NoteIcon, PhoneIcon, PlusIcon, UsersIcon } from './DashIcons';

const QUERY = `{
  "companies": *[_type == "company"]{ _id, _createdAt, _updatedAt, name, category, website, email, phone, address, aliases, notes, addedAt, savedAt },
  "people": *[_type == "client"]{ _id, _createdAt, _updatedAt, name, role, "company": company._ref, emails, phones, notes, addedAt, savedAt, kind, category, website, aliases, "people": people[]{ name, role, emails, phones } },
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
const LISTEN = '*[_type in ["company", "client", "booking", "enquiry", "shoot"]]';

/** your companies and their people, kept up to date as shoots and enquiries change
    (also used by UpdatesHome.jsx for its menu, and by the company picker on a client) */
export function useClientsData() {
  const client = useClient({ apiVersion: CLIENTS_API });
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
    if (!data) return { companies: [], loners: [], loose: [], savedIds: [], loading: true };
    const bookings = latestById(data.bookings).map(withMoney);
    const companyDocs = latestById(data.companies);
    const clientDocs = latestById(data.people);
    const { companies, loners } = buildClients(
      { ...savedRecords(companyDocs, clientDocs), bookings, enquiries: latestById(data.enquiries), work: latestById(data.work) },
      todayYmd()
    );
    return {
      companies,
      loners: [...loners].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'en-GB', { sensitivity: 'base' })),
      loose: unattached(bookings),
      savedIds: [...companyDocs, ...clientDocs].map((d) => d._baseId),
      loading: false,
    };
  }, [data]);
}

/* ---------- small pieces ---------- */

/* what's open, kept while you pop out to edit something and come back */
const remembered = { sort: 'recent', show: 'all', category: '', q: '', open: '', person: '' };

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
);

const SHOWS = [
  { value: 'all', title: 'All' },
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
/** "Yesterday", "5 days ago", "3 weeks ago", "2 months ago" */
function ago(day, today) {
  const n = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)) / 86400000);
  return n < 14 ? relDay(day) : `${since(day, today)} ago`;
}
const tel = (t) => String(t || '').replace(/[^\d+]/g, '');
const find = (list, key) => (key ? list.find((x) => x.key === key) || null : null);

/* the line under a company's name in the list: who works there */
function listLine(c) {
  const names = c.people.map((p) => p.name).filter(Boolean);
  if (names.length > 2) return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
  if (names.length) return names.join(' and ');
  return categoryTitle(c.category) || 'No one added yet';
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
/* under a person's name: their role and what they've done with you */
function personLine(p) {
  const bits = [p.roles[0], p.stats.shoots ? plural(p.stats.shoots, 'shoot', 'shoots') : '', p.stats.enquiries ? plural(p.stats.enquiries, 'enquiry', 'enquiries') : ''].filter(Boolean);
  return bits.join(' · ') || p.emails[0] || p.phones[0] || 'Client';
}

/** busy while saving, and a short note if it didn't work */
function useRun() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const run = async (fn) => {
    setBusy(true);
    setNote('');
    try {
      await fn();
    } catch {
      setNote('That didn’t save. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return { busy, note, run };
}

/** a newly opened page starts at its top, even if you clicked something further down */
function useTopOnOpen() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el && el.getBoundingClientRect().top < 0 && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  return ref;
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

/* the same four numbers for a company and for a person */
function Tiles({ x, today }) {
  const next = x.nextShoot;
  return (
    <div className="lo-cl-tiles">
      <Tile
        label="Shoots"
        value={x.stats.shoots}
        sub={[x.stats.done ? `${x.stats.done} done` : '', x.stats.upcoming ? `${x.stats.upcoming} coming up` : '', x.stats.cancelled ? `${x.stats.cancelled} cancelled` : ''].filter(Boolean).join(' · ')}
      />
      <Tile label="Earned" value={money(x.stats.earned)} sub={x.stats.owed > 0 ? `${money(x.stats.owed)} still to pay` : x.stats.earned > 0 ? 'All paid' : ''} accent={x.stats.owed > 0} />
      {next ? (
        <Tile label="Next shoot" value={fmtDay(next.first, { day: 'numeric', month: 'short' })} sub={relDay(next.first)} />
      ) : (
        <Tile label="Last shoot" value={x.lastShoot ? fmtDay(x.lastShoot, { day: 'numeric', month: 'short' }) : 'None yet'} sub={x.lastShoot ? ago(x.lastShoot, today) : ''} />
      )}
      <Tile label="Client since" value={fmtDay(x.addedAt, { month: 'short', year: 'numeric' })} sub={x.addedAt >= today ? 'Added today' : `A client for ${since(x.addedAt, today)}`} />
    </div>
  );
}

function ShootsCard({ shoots, today, empty, showWho }) {
  return (
    <section className="lo-cl-card">
      <span className="lo-cl-card-label">
        <CameraIcon /> Shoots <span>{shoots.length}</span>
      </span>
      {shoots.length ? (
        <ul className="lo-cl-shoots">
          {shoots.map((b) => (
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
                    {[showWho && b.client && b.client.name, b.money && b.money.income ? money(b.money.income) : '', b.first && b.last >= today ? relDay(b.first) : ''].filter(Boolean).join(' · ') || ' '}
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
        <p className="lo-cl-empty">{empty}</p>
      )}
    </section>
  );
}

function EnquiriesCard({ enquiries, empty }) {
  return (
    <section className="lo-cl-card">
      <span className="lo-cl-card-label">
        <InboxIcon /> Enquiries <span>{enquiries.length}</span>
      </span>
      {enquiries.length ? (
        <ul className="lo-cl-enqs">
          {enquiries.map((e) => (
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
        <p className="lo-cl-empty">{empty}</p>
      )}
    </section>
  );
}

function Note({ note }) {
  return note ? (
    <p className="lo-cl-note" role="alert">
      {note}
    </p>
  ) : null;
}

/* ---------- merging two that are really the same ---------- */

const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/* what you can merge a company with: every other company */
function companyChoices(companies, c) {
  return companies
    .filter((x) => x.key !== c.key)
    .sort((a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' }))
    .map((x) => ({ key: x.key, name: x.name, sub: [plural(x.stats.people, 'person', 'people'), plural(x.stats.shoots, 'shoot', 'shoots')].join(' · '), search: x.search, company: x }));
}
/* what you can merge a person with: the others at their company and anyone with no company
   (someone with no company can be merged with anyone) */
function personChoices(p, company, companies, loners) {
  const out = [];
  const add = (x, co) => {
    if (x === p) return;
    out.push({
      key: `${co ? co.key : 'none'}:${x.key}`,
      name: x.name || x.emails[0] || x.phones[0] || 'Someone',
      sub: [co ? co.name : 'No company', x.roles[0], x.emails[0] || x.phones[0]].filter(Boolean).join(' · '),
      search: [x.name, ...x.otherNames, ...x.emails, ...x.phones, co ? co.name : ''].join(' ').toLowerCase(),
      person: x,
      company: co,
    });
  };
  if (company) company.people.forEach((x) => add(x, company));
  loners.forEach((x) => add(x, null));
  if (!company) companies.forEach((co) => co.people.forEach((x) => add(x, co)));
  return out;
}

/* pick the other one, choose which name to keep, then merge */
function MergePanel({ kind, current, choices, onMerge, onClose }) {
  const [q, setQ] = useState('');
  const [pick, setPick] = useState(null);
  const [keepName, setKeepName] = useState(current.name);
  const { busy, note, run } = useRun();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = choices.filter((o) => words.every((w) => o.search.includes(w)));
  const company = kind === 'company';

  return (
    <div className="lo-cl-merge" role="group" aria-label={company ? 'Merge with another company' : 'Merge with another person'}>
      {!pick ? (
        <>
          <div className="lo-cl-merge-head">
            <b>Merge another {company ? 'company' : 'person'} into {current.name}</b>
            <button type="button" className="lo-cl-merge-x" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
          <p className="lo-cl-merge-text">{company ? 'For the same business listed twice. Pick the other one.' : 'For the same person listed twice. Pick the other one.'}</p>
          <label className="lo-cp-search">
            <SearchIcon />
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder={company ? 'Search your companies' : 'Search people'} aria-label={company ? 'Search your companies' : 'Search people'} autoFocus />
          </label>
          <div className="lo-cp-list" role="listbox" aria-label={company ? 'Companies' : 'People'}>
            {shown.slice(0, 8).map((o) => (
              <button
                key={o.key}
                type="button"
                role="option"
                aria-selected="false"
                className="lo-cp-opt"
                onClick={() => {
                  setPick(o);
                  setKeepName(current.name);
                }}
              >
                <span className="lo-cl-av" data-kind={company ? undefined : 'person'}>
                  {initials(o.name || '?')}
                </span>
                <span className="lo-cp-main">
                  <b>{o.name}</b>
                  <small>{o.sub}</small>
                </span>
              </button>
            ))}
            {!shown.length ? <p className="lo-cp-empty">{choices.length ? 'No match.' : `No other ${company ? 'companies' : 'people'} to merge with yet.`}</p> : null}
          </div>
        </>
      ) : (
        <>
          <div className="lo-cl-merge-head">
            <b>
              Merge {pick.name} into {current.name}?
            </b>
          </div>
          <p className="lo-cl-merge-text">
            {company ? 'Their people, shoots, enquiries and details all show under one company.' : 'Their shoots, enquiries, numbers and email addresses all show under one person.'} Anything that’s different is kept: other names, numbers and
            emails stay listed with the rest. You can’t undo this.
          </p>
          {!same(current.name, pick.name) ? (
            <div className="lo-cl-merge-names" role="radiogroup" aria-label="Name to keep">
              <span>Name to keep</span>
              {[current.name, pick.name].map((n) => (
                <label key={n}>
                  <input type="radio" name={`lo-keep-${kind}`} checked={keepName === n} onChange={() => setKeepName(n)} /> {n}
                </label>
              ))}
            </div>
          ) : null}
          <Note note={note} />
          <div className="lo-cl-merge-acts">
            <button type="button" className="lo-cv-btn" data-primary="" disabled={busy} onClick={() => run(() => onMerge(pick, keepName))}>
              <MergeIcon /> {busy ? 'Merging…' : company ? 'Merge companies' : 'Merge clients'}
            </button>
            <button type="button" className="lo-cv-btn" disabled={busy} onClick={() => setPick(null)}>
              Back
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- a company ---------- */

function CompanyDetail({ c, companies, today, onBack, onPerson, onSaved }) {
  const client = useClient({ apiVersion: CLIENTS_API });
  const router = useRouter();
  const { busy, note, run } = useRun();
  const [merging, setMerging] = useState(false);
  const top = useTopOnOpen();
  const main = c.people[0] || null;
  // a company found from your shoots gets its own record the first time you change something on it
  const recorded = Boolean(c.saved && !c.saved.legacy);

  const pickCategory = (value) =>
    run(async () => {
      const id = await ensureCompany(client, c, { category: value });
      if (id !== c.key) onSaved(id);
    });
  const editDetails = () =>
    run(async () => {
      const id = await ensureCompany(client, c);
      remembered.open = id;
      remembered.person = '';
      router.navigateIntent('edit', { id, type: 'company' });
    });
  const addPerson = () =>
    run(async () => {
      const id = await ensureCompany(client, c);
      remembered.open = id;
      remembered.person = '';
      addPersonTo(router, id);
    });
  const book = () =>
    bookShoot(router, {
      client: { company: c.name, name: main ? main.name : '', email: main ? main.emails[0] : '', phone: main ? main.phones[0] : '' },
    });

  const site = c.website ? c.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '';
  const details = [
    site ? { label: 'Website', value: <a href={c.website} target="_blank" rel="noreferrer">{site} ↗</a> } : null,
    c.email ? { label: 'Email', value: <a href={`mailto:${c.email}`}>{c.email}</a> } : null,
    c.phone ? { label: 'Phone', value: <a href={`tel:${tel(c.phone)}`}>{c.phone}</a> } : null,
    c.address ? { label: 'Address', value: <span className="lo-cl-addr">{c.address}</span> } : null,
  ].filter(Boolean);

  return (
    <section className="lo-cl-detail" aria-label={c.name} ref={top}>
      <button type="button" className="lo-cl-back" onClick={onBack}>
        <ChevronLeft /> All companies
      </button>
      <header className="lo-cl-head">
        <span className="lo-cl-av" data-big="">
          {initials(c.name)}
        </span>
        <div className="lo-cl-head-main">
          <span className="lo-cl-kicker">
            Company
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
        {recorded ? (
          <IntentLink intent="edit" params={{ id: c.saved._baseId, type: 'company' }} className="lo-cv-btn">
            Edit company details
          </IntentLink>
        ) : (
          <button type="button" className="lo-cv-btn" onClick={editDetails} disabled={busy}>
            Edit company details
          </button>
        )}
        <button type="button" className="lo-cv-btn" onClick={() => setMerging((v) => !v)} aria-expanded={merging} title="The same company listed twice? Merge them into one">
          <MergeIcon /> Merge
        </button>
        <button type="button" className="lo-cv-btn" data-primary="" onClick={book}>
          <PlusIcon /> Book a shoot
        </button>
      </div>
      <Note note={note} />
      {merging ? (
        <MergePanel
          kind="company"
          current={c}
          choices={companyChoices(companies, c)}
          onClose={() => setMerging(false)}
          onMerge={async (pick, name) => {
            const id = await mergeCompanies(client, c, pick.company, name);
            setMerging(false);
            onSaved(id);
          }}
        />
      ) : null}
      {!c.saved ? <p className="lo-cl-hint">Put together from their shoots and enquiries. Its details are kept once you edit them or add a person.</p> : null}

      <Tiles x={c} today={today} />

      <div className="lo-cl-cards">
        <section className="lo-cl-card">
          <span className="lo-cl-card-label">
            <UsersIcon /> People <span>{c.people.length}</span>
          </span>
          {c.people.length ? (
            <ul className="lo-cl-people">
              {c.people.map((p) => (
                <li key={p.key}>
                  <button type="button" className="lo-cl-prow" onClick={() => onPerson(p.key)} aria-label={`Open ${p.name || 'this person'}`}>
                    <span className="lo-cl-av" data-kind="person">
                      {initials(p.name || p.emails[0] || '?')}
                    </span>
                    <span className="lo-cl-prow-main">
                      <b>{p.name || 'Name not given'}</b>
                      <small>{personLine(p)}</small>
                    </span>
                    <ChevronRight />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="lo-cl-empty">No one added yet.</p>
          )}
          <button type="button" className="lo-cl-addp" onClick={addPerson} disabled={busy}>
            <PlusIcon /> Add a person
          </button>
        </section>

        <section className="lo-cl-card">
          <span className="lo-cl-card-label">
            <NoteIcon /> Company details
          </span>
          {details.length ? (
            <dl className="lo-cl-info">
              {details.map((d) => (
                <div key={d.label}>
                  <dt>{d.label}</dt>
                  <dd>{d.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {c.notes ? <p className="lo-cl-notes">{c.notes}</p> : null}
          {!details.length && !c.notes ? (
            <>
              <p className="lo-cl-empty">No website, email, phone or address yet.</p>
              {recorded ? (
                <IntentLink intent="edit" params={{ id: c.saved._baseId, type: 'company' }} className="lo-cl-addp">
                  <PlusIcon /> Add company details
                </IntentLink>
              ) : (
                <button type="button" className="lo-cl-addp" onClick={editDetails} disabled={busy}>
                  <PlusIcon /> Add company details
                </button>
              )}
            </>
          ) : null}
        </section>

        <ShootsCard shoots={c.shoots} today={today} showWho empty="No shoots yet. Book one and it appears here." />

        {c.work.length ? (
          <section className="lo-cl-card">
            <span className="lo-cl-card-label">
              <CameraIcon /> On your website <span>{c.work.length}</span>
            </span>
            <div className="lo-cl-work">
              {c.work.map((w) => (
                <IntentLink key={w._baseId || w._id} intent="edit" params={{ id: w._baseId || w._id, type: 'shoot' }} className="lo-cl-workitem" title={w.title}>
                  {w.thumb ? (
                    <img src={`${w.thumb}?w=360&h=240&fit=crop&auto=format`} alt="" loading="lazy" />
                  ) : (
                    <span className="lo-cl-workempty">
                      <CameraIcon />
                    </span>
                  )}
                  <small>{[w.category, w.date ? String(w.date).slice(0, 4) : ''].filter(Boolean).join(' · ') || w.title}</small>
                </IntentLink>
              ))}
            </div>
          </section>
        ) : null}

        <EnquiriesCard enquiries={c.enquiries} empty="No enquiries from them through your website." />
      </div>

      {c.alsoSaved.length ? (
        <p className="lo-cl-hint">
          Also saved separately as{' '}
          {c.alsoSaved.map((d, i) => (
            <span key={d._baseId}>
              {i ? ', ' : ''}
              <IntentLink intent="edit" params={{ id: d._baseId, type: d.legacy ? 'client' : 'company' }}>
                {d.name || 'a company'}
              </IntentLink>
            </span>
          ))}
          . The details match, so they’re shown together here. You can delete the extra one.
        </p>
      ) : null}
    </section>
  );
}

/* ---------- a person (a client), opened from their company ---------- */

function PersonDetail({ p, company, companies, loners, today, onBack, onSaved }) {
  const client = useClient({ apiVersion: CLIENTS_API });
  const router = useRouter();
  const { busy, note, run } = useRun();
  const [merging, setMerging] = useState(false);
  const top = useTopOnOpen();
  const legacy = Boolean(p.saved && p.saved.kind);

  const save = () =>
    run(async () => {
      const companyId = company ? await ensureCompany(client, company) : '';
      const id = await createClient(client, { name: p.name, role: p.roles[0], emails: p.emails, phones: p.phones, companyId, addedAt: p.addedAt });
      onSaved({ person: id, company: companyId });
    });
  const editOld = () =>
    run(async () => {
      await tidyLegacyPerson(client, p.saved);
      router.navigateIntent('edit', { id: p.saved._baseId, type: 'client' });
    });
  const book = () => bookShoot(router, { client: { company: company ? company.name : '', name: p.name, email: p.emails[0] || '', phone: p.phones[0] || '' } });

  return (
    <section className="lo-cl-detail" aria-label={p.name || 'Client'} ref={top} data-person="">
      <button type="button" className="lo-cl-up" onClick={onBack}>
        <ChevronLeft /> <span>{company ? company.name : 'All companies'}</span>
      </button>
      <header className="lo-cl-head">
        <span className="lo-cl-av" data-kind="person" data-big="">
          {initials(p.name || p.emails[0] || '?')}
        </span>
        <div className="lo-cl-head-main">
          <span className="lo-cl-kicker">{company ? `Client at ${company.name}` : 'Client · No company'}</span>
          <h2 className="lo-cl-name">{p.name || 'Name not given'}</h2>
          {p.roles.length ? <small className="lo-cl-aka">{p.roles.join(', ')}</small> : null}
          {p.otherNames.length ? <small className="lo-cl-aka" data-names="">Also booked as {p.otherNames.join(', ')}</small> : null}
        </div>
      </header>

      <div className="lo-cl-actions">
        {p.saved && !legacy ? (
          <IntentLink intent="edit" params={{ id: p.saved._baseId, type: 'client' }} className="lo-cv-btn">
            Edit details
          </IntentLink>
        ) : p.saved ? (
          <button type="button" className="lo-cv-btn" onClick={editOld} disabled={busy}>
            Edit details
          </button>
        ) : (
          <button type="button" className="lo-cv-btn" onClick={save} disabled={busy || !p.name} title={p.name ? 'Keep them as a client, to add notes and edit their details' : 'Their name isn’t on their shoots yet'}>
            {busy ? 'Saving…' : 'Save as client'}
          </button>
        )}
        {p.emails[0] ? (
          <a className="lo-cv-btn" href={`mailto:${p.emails[0]}`}>
            <MailIcon /> Email
          </a>
        ) : null}
        {p.phones[0] ? (
          <a className="lo-cv-btn" href={`tel:${tel(p.phones[0])}`}>
            <PhoneIcon /> Call
          </a>
        ) : null}
        <button type="button" className="lo-cv-btn" onClick={() => setMerging((v) => !v)} aria-expanded={merging} title="The same person listed twice? Merge them into one">
          <MergeIcon /> Merge
        </button>
        <button type="button" className="lo-cv-btn" data-primary="" onClick={book}>
          <PlusIcon /> Book a shoot
        </button>
      </div>
      <Note note={note} />
      {merging ? (
        <MergePanel
          kind="person"
          current={p}
          choices={personChoices(p, company, companies, loners)}
          onClose={() => setMerging(false)}
          onMerge={async (pick, name) => {
            const res = await mergeClients(client, p, pick.person, { company, otherCompany: pick.company, name });
            setMerging(false);
            onSaved(res);
          }}
        />
      ) : null}
      {p.alsoSaved && p.alsoSaved.length ? (
        <p className="lo-cl-hint">
          Also saved separately as{' '}
          {p.alsoSaved.map((d, i) => (
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
      {!p.saved ? <p className="lo-cl-hint">Found from their shoots and enquiries. Save them as a client to keep notes and edit their details.</p> : null}

      <Tiles x={p} today={today} />

      <div className="lo-cl-cards">
        <section className="lo-cl-card">
          <span className="lo-cl-card-label">
            <PhoneIcon /> Contact details
          </span>
          {p.emails.length || p.phones.length ? (
            <span className="lo-cl-contacts">
              {p.emails.map((e) => (
                <a key={e} href={`mailto:${e}`} className="lo-cl-contact">
                  <MailIcon /> {e}
                </a>
              ))}
              {p.phones.map((t) => (
                <a key={t} href={`tel:${tel(t)}`} className="lo-cl-contact">
                  <PhoneIcon /> {t}
                </a>
              ))}
            </span>
          ) : (
            <p className="lo-cl-empty">No email address or phone number yet.</p>
          )}
          {p.notes ? <p className="lo-cl-notes">{p.notes}</p> : null}
        </section>

        <ShootsCard shoots={p.shoots} today={today} empty="No shoots booked with them yet." />
        <EnquiriesCard enquiries={p.enquiries} empty="No enquiries from them through your website." />
      </div>
    </section>
  );
}

/* ---------- the page ---------- */

export function ClientsPane() {
  const { companies, loners, loose, loading } = useClientsData();
  const [sort, setSort] = useState(remembered.sort);
  const [show, setShow] = useState(remembered.show);
  const [category, setCategory] = useState(remembered.category);
  const [q, setQ] = useState(remembered.q);
  const [open, setOpen] = useState(remembered.open);
  const [person, setPerson] = useState(remembered.person);
  // while a company or person you've just saved comes back as a saved record, keep showing them
  const [was, setWas] = useState('');
  const [wasPerson, setWasPerson] = useState('');
  const [allLoners, setAllLoners] = useState(false);
  const today = todayYmd();

  useEffect(() => {
    Object.assign(remembered, { sort, show, category, q, open, person });
  }, [sort, show, category, q, open, person]);

  const list = useMemo(() => sortClients(filterClients(companies, { show, category, q }), sort), [companies, show, category, q, sort]);
  const counts = useMemo(() => {
    const out = {};
    SHOWS.forEach((s) => {
      out[s.value] = filterClients(companies, { show: s.value }).length;
    });
    return out;
  }, [companies]);
  const usedCategories = CLIENT_CATEGORIES.filter((k) => companies.some((c) => c.category === k.value));

  const picked = find(companies, open) || find(companies, was);
  const loner = !picked && person ? find(loners, person) || find(loners, wasPerson) : null;
  const current = picked || (loner ? null : list[0]) || null;
  const who = loner || (current && person ? find(current.people, person) || find(current.people, wasPerson) : null);
  // a page keeps its place while what you just saved comes back under its new key
  const companyView = current ? (was && [was, open].includes(current.key) ? was : current.key) : '';
  const personView = who ? (wasPerson && [wasPerson, person].includes(who.key) ? wasPerson : who.key) : '';

  const clear = () => {
    setQ('');
    setShow('all');
    setCategory('');
  };
  const openCompany = (key) => {
    setOpen(key);
    setWas('');
    setPerson('');
    setWasPerson('');
  };
  const openLoner = (key) => {
    setOpen('');
    setWas('');
    setPerson(key);
    setWasPerson('');
  };
  const peopleCount = companies.reduce((t, c) => t + c.people.length, 0) + loners.length;

  return (
    <div className="lo-upsec">
      <div className="lo-cv lo-cl" data-open={picked || loner ? '' : undefined}>
        <header className="lo-cv-hero">
          <span className="lo-eyebrow">
            <span className="lo-eyebrow-dot" aria-hidden="true" />
            Clients
          </span>
          <div className="lo-cv-headrow">
            <h1 className="lo-cv-title">{loading || !companies.length ? 'Your clients' : plural(companies.length, 'company', 'companies')}</h1>
            <IntentLink intent="create" params={{ type: 'client', template: 'client' }} className="lo-cv-btn" data-primary="">
              <PlusIcon /> New client
            </IntentLink>
          </div>
          <p className="lo-cv-text">
            {!loading && companies.length
              ? `Every company you shoot for, and the ${peopleCount === 1 ? 'person' : `${peopleCount} people`} you deal with. Open a company to see who works there, and everything you’ve done together.`
              : 'Every company you shoot for, with the people who work there inside it.'}
          </p>
        </header>

        {loading ? (
          <p className="lo-cl-loading">Gathering your clients…</p>
        ) : companies.length || loners.length ? (
          <>
            <div className="lo-cl-tools">
              <label className="lo-cl-search">
                <SearchIcon />
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies, people, emails or numbers" aria-label="Search companies" />
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
                      onClick={() => openCompany(c.key)}
                      style={{ '--i': Math.min(i, 14) }}
                    >
                      <span className="lo-cl-av">{initials(c.name)}</span>
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
                    <p>{companies.length ? 'No companies match that.' : 'No companies yet. Every company that books a shoot appears here.'}</p>
                    {companies.length ? (
                      <button type="button" className="lo-cv-btn" onClick={clear}>
                        Show all companies
                      </button>
                    ) : null}
                  </div>
                )}
                {loners.length ? (
                  <p className="lo-cl-loose" data-loners="">
                    {loners.length === 1 ? 'One client doesn’t work for a company' : `${loners.length} clients don’t work for a company`}:{' '}
                    {(allLoners ? loners : loners.slice(0, 5)).map((p, i) => (
                      <span key={p.key}>
                        {i ? ', ' : ''}
                        <button type="button" className="lo-cl-link" data-active={who && who.key === p.key ? '' : undefined} onClick={() => openLoner(p.key)}>
                          {p.name || p.emails[0] || p.phones[0] || 'Someone'}
                        </button>
                      </span>
                    ))}
                    {!allLoners && loners.length > 5 ? (
                      <>
                        {' '}
                        and{' '}
                        <button type="button" className="lo-cl-link" onClick={() => setAllLoners(true)}>
                          {loners.length - 5} more
                        </button>
                      </>
                    ) : null}
                    .
                  </p>
                ) : null}
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
              {who ? (
                <PersonDetail
                  key={`person-${personView}`}
                  p={who}
                  company={loner ? null : current}
                  companies={companies}
                  loners={loners}
                  today={today}
                  onBack={() => {
                    setPerson('');
                    setWasPerson('');
                  }}
                  onSaved={({ person: id, company: companyId }) => {
                    // their company may have just got its record, or (someone with no company) they've joined one
                    if (companyId && (!current || companyId !== current.key)) {
                      setWas(current && !loner ? current.key : '');
                      setOpen(companyId);
                    }
                    setWasPerson(who.key);
                    setPerson(id);
                  }}
                />
              ) : current ? (
                <CompanyDetail
                  key={companyView}
                  c={current}
                  companies={companies}
                  today={today}
                  onBack={() => openCompany('')}
                  onPerson={(key) => {
                    // keep this company open (a company you picked is already, even mid save)
                    if (!picked) setOpen(current.key);
                    setPerson(key);
                    setWasPerson('');
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
            <p>No clients yet. Every company that books a shoot appears here, with its people inside. You can also add a client before their first booking.</p>
            <IntentLink intent="create" params={{ type: 'client', template: 'client' }} className="lo-cv-btn" data-primary="">
              <PlusIcon /> Add a client
            </IntentLink>
          </div>
        )}
      </div>
    </div>
  );
}
