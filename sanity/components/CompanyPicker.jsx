'use client';

/**
 * "Which company do they work for or own?" on a client: pick one of your companies, or type a new
 * one. A brand new company is saved along with the client (when you press Save client); one found
 * from your shoots is saved straight away. Styles: app/studio/studio.css (".lo-cp…").
 */

import { useEffect, useMemo, useState } from 'react';
import { set, unset, useClient, useFormValue } from 'sanity';
import { initials } from '../bookingData';
import { orgKey } from '../clientData';
import { useClientsData } from './ClientsPane';
import { CLIENTS_API, companyRef, createCompany, ensureCompany } from './clientRecords';
import { PlusIcon } from './DashIcons';

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function CompanyPicker(props) {
  const { value, onChange, readOnly } = props;
  const client = useClient({ apiVersion: CLIENTS_API });
  const { companies, loading } = useClientsData();
  const [q, setQ] = useState('');
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [fetched, setFetched] = useState(null);
  const ref = value && value._ref ? String(value._ref) : '';
  // once this client is saved, a company typed in here is saved straight away too
  const savedAt = useFormValue(['savedAt']);
  const oldKind = useFormValue(['kind']);
  const clientSaved = Boolean(savedAt || oldKind);

  /* the chosen company, from your list, or (for one just typed in) straight from its record */
  const known = companies.find((c) => c.saved && c.saved._baseId === ref) || null;
  useEffect(() => {
    let alive = true;
    if (!ref || known) {
      setFetched(null);
      return undefined;
    }
    client
      .fetch('*[_id in [$id, "drafts." + $id]] | order(_updatedAt desc)[0]{ name, savedAt }', { id: ref })
      .then((d) => alive && setFetched(d || { name: '' }))
      .catch(() => alive && setFetched({ name: '' }));
    return () => {
      alive = false;
    };
  }, [client, ref, known]);

  const matches = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return companies
      .filter((c) => words.every((w) => c.name.toLowerCase().includes(w) || c.otherNames.some((o) => o.toLowerCase().includes(w))))
      .sort((a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' }));
  }, [companies, q]);
  const typed = q.trim();
  const exact = typed && companies.some((c) => orgKey(c.name) === orgKey(typed) || c.otherNames.some((o) => orgKey(o) === orgKey(typed)));

  const choose = async (make) => {
    setBusy(true);
    setNote('');
    try {
      const id = await make();
      onChange(set(companyRef(id)));
      setPicking(false);
      setQ('');
    } catch {
      setNote('That didn’t work. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const pick = (c) => choose(() => ensureCompany(client, c));
  const addNew = () => choose(() => createCompany(client, { name: typed, saved: clientSaved }));

  // while the picked company loads, hold its place rather than flash the search
  const current = ref ? known || (fetched ? { name: fetched.name || 'Company', fresh: !fetched.savedAt } : { name: '', pending: true }) : null;
  const open = !current || picking;

  return (
    <div className="lo-cp">
      {current ? (
        <div className="lo-cp-current">
          <span className="lo-cl-av">{current.pending ? '' : initials(current.name)}</span>
          <span className="lo-cp-main">
            <b>{current.pending ? 'Loading…' : current.name}</b>
            <small>
              {known
                ? [plural(known.stats.people, 'person', 'people'), plural(known.stats.shoots, 'shoot', 'shoots')].join(' · ')
                : current.pending
                  ? ' '
                  : current.fresh
                    ? 'New company. It’s saved when you save this client.'
                    : 'Company'}
            </small>
          </span>
          {!readOnly ? (
            <span className="lo-cp-acts">
              <button type="button" className="lo-cp-btn" onClick={() => setPicking((v) => !v)} disabled={busy}>
                {picking ? 'Keep it' : 'Change'}
              </button>
              <button type="button" className="lo-cp-btn" data-quiet="" onClick={() => onChange(unset())} disabled={busy} title="They book as themselves">
                No company
              </button>
            </span>
          ) : null}
        </div>
      ) : null}

      {open && !readOnly ? (
        <div className="lo-cp-pick">
          <label className="lo-cp-search">
            <SearchIcon />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (matches.length === 1) pick(matches[0]);
                  else if (typed && !exact) addNew();
                }
              }}
              placeholder="Search your companies, or type a new one"
              aria-label="Company"
              disabled={busy}
            />
          </label>
          <div className="lo-cp-list" role="listbox" aria-label="Your companies">
            {matches.slice(0, 6).map((c) => (
              <button key={c.key} type="button" role="option" aria-selected={Boolean(c.saved && c.saved._baseId === ref)} className="lo-cp-opt" onClick={() => pick(c)} disabled={busy}>
                <span className="lo-cl-av">{initials(c.name)}</span>
                <span className="lo-cp-main">
                  <b>{c.name}</b>
                  <small>{[plural(c.stats.people, 'person', 'people'), plural(c.stats.shoots, 'shoot', 'shoots')].join(' · ')}</small>
                </span>
              </button>
            ))}
            {typed && !exact ? (
              <button type="button" className="lo-cp-opt" data-new="" onClick={addNew} disabled={busy}>
                <span className="lo-cp-plus">
                  <PlusIcon />
                </span>
                <span className="lo-cp-main">
                  <b>Add “{typed}” as a new company</b>
                  <small>{clientSaved ? 'It’s added to your clients straight away' : 'It’s saved when you save this client'}</small>
                </span>
              </button>
            ) : null}
            {!loading && !matches.length && !typed ? <p className="lo-cp-empty">No companies yet. Type the company’s name to add it.</p> : null}
            {!loading && !matches.length && typed && exact ? <p className="lo-cp-empty">No other matches.</p> : null}
          </div>
        </div>
      ) : null}
      {note ? (
        <p className="lo-cp-note" role="alert">
          {note}
        </p>
      ) : null}
    </div>
  );
}
