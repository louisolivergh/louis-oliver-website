'use client';

/**
 * The booked-shoot form's own parts (styled in app/studio/studio.css, ".lo-li…", ".lo-client…", ".lo-sum…"):
 *  - ClientInput: match the enquiry a shoot came from, so the client's details, budget and message come across.
 *  - ListInput: quick inline lists, locations, cast & crew, prices, costs, payments, schedule, shots, notes, links.
 *  - BudgetSummaryInput: the money, worked out from everything on the shoot.
 * Everything saves as you type, like the rest of the dashboard.
 */

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@sanity/ui';
import { insert, set, setIfMissing, unset, useClient, useFormValue } from 'sanity';
import { IntentLink } from 'sanity/router';
import {
  addDays,
  categoryTitle,
  clientFromEnquiry,
  clientLine,
  computeBudget,
  COST_CATEGORIES,
  dayInfo,
  fmtDay,
  initials,
  latestById,
  lineTotal,
  LINK_KINDS,
  LOCATION_TYPES,
  mapsUrl,
  money,
  percent,
  personCost,
  RATE_UNITS,
  REMINDER_OPTIONS,
  reminderDays,
  reminderHour,
  reminderPlan,
  roleOf,
  ROLES,
  shootDays,
  tidyRange,
  todayYmd,
  UNITS,
} from '../bookingData';
import { MailIcon, PhoneIcon } from './DashIcons';
import { tickEnquiry } from './shootData';
import { ShootMode } from './shootMode';

const makeKey = () => Math.random().toString(36).slice(2, 12);

/* ---------- tiny icons ---------- */
const Svg = ({ children, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const IconUp = () => <Svg><path d="M8 12.5v-9M4.5 7l3.5-3.5L11.5 7" /></Svg>;
const IconDown = () => <Svg><path d="M8 3.5v9M4.5 9l3.5 3.5L11.5 9" /></Svg>;
const IconX = () => <Svg><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" /></Svg>;
const IconPlus = () => <Svg><path d="M8 3.2v9.6M3.2 8h9.6" /></Svg>;
const IconTick = () => <Svg size={11}><path d="M3.4 8.4l3.1 3L12.6 4.8" /></Svg>;
const IconOut = () => <Svg size={12}><path d="M5.5 10.5l5-5M6.5 5.5h4v4" /></Svg>;
const IconUser = () => <Svg size={13}><circle cx="8" cy="5.6" r="2.6" /><path d="M3 13.6c.7-2.6 2.6-3.9 5-3.9s4.3 1.3 5 3.9" /></Svg>;
const IconTag = () => <Svg size={13}><path d="M2.5 8.6V3.2c0-.4.3-.7.7-.7h5.4l5 5a1 1 0 0 1 0 1.4l-4.4 4.4a1 1 0 0 1-1.4 0z" /><circle cx="5.6" cy="5.6" r="1" /></Svg>;
const IconPin = () => <Svg size={13}><path d="M8 14.5s-4.5-4.2-4.5-7.6a4.5 4.5 0 0 1 9 0c0 3.4-4.5 7.6-4.5 7.6z" /><circle cx="8" cy="6.9" r="1.6" /></Svg>;

/* ---------- inputs ---------- */

/** Money and numbers: type freely ("1,250", "£40", "0.45"); it saves as a number. */
function NumberBox({ value, onCommit, prefix, placeholder, readOnly, label, autoFocus }) {
  const [draft, setDraft] = useState(null);
  const shown = draft !== null ? draft : typeof value === 'number' ? String(value) : '';
  return (
    <span className="lo-li-num">
      {prefix ? <span className="lo-li-prefix" aria-hidden="true">{prefix}</span> : null}
      <input
        type="text"
        inputMode="decimal"
        className="lo-li-input"
        value={shown}
        placeholder={placeholder}
        aria-label={label}
        readOnly={readOnly}
        autoFocus={autoFocus}
        onFocus={() => setDraft(typeof value === 'number' ? String(value) : '')}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          const raw = e.target.value.replace(/[£,\s]/g, '');
          if (!/^-?\d*\.?\d*$/.test(raw)) return;
          setDraft(raw);
          const n = parseFloat(raw);
          onCommit(Number.isFinite(n) ? n : undefined);
        }}
      />
    </span>
  );
}

/** A text box that grows with what you type */
function AutoArea({ value, onChange, placeholder, readOnly, label, autoFocus, rows = 2 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className="lo-li-area"
      rows={rows}
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      aria-label={label}
      autoFocus={autoFocus}
    />
  );
}

function hrefFor(kind, v) {
  if (typeof v !== 'string' || !v.trim()) return '';
  const s = v.trim();
  if (kind === 'tel') return s.replace(/[^\d+]/g, '').length >= 6 ? `tel:${s.replace(/[^\d+]/g, '')}` : '';
  if (kind === 'email') return /\S+@\S+\.\S+/.test(s) ? `mailto:${s}` : '';
  if (kind === 'url') {
    if (/^https?:\/\//i.test(s)) return s;
    return /^[\w-]+(\.[\w-]+)+/.test(s) ? `https://${s}` : '';
  }
  return '';
}

function Control({ f, item, label, onSet, readOnly, autoFocus }) {
  const v = item[f.name];
  switch (f.kind) {
    case 'money':
    case 'number':
      return <NumberBox value={v} onCommit={onSet} prefix={f.kind === 'money' ? '£' : ''} placeholder={f.placeholder} readOnly={readOnly} label={label} autoFocus={autoFocus} />;
    case 'select':
      return (
        <select className="lo-li-select" value={typeof v === 'string' ? v : ''} onChange={(e) => onSet(e.target.value)} disabled={readOnly} aria-label={label} autoFocus={autoFocus}>
          <option value="">{f.emptyLabel || 'Choose…'}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.title}
            </option>
          ))}
        </select>
      );
    case 'date':
      return <input type="date" className="lo-li-input" value={typeof v === 'string' ? v : ''} onChange={(e) => onSet(e.target.value)} readOnly={readOnly} aria-label={label} autoFocus={autoFocus} />;
    case 'time':
      return <input type="time" className="lo-li-input" step={300} value={typeof v === 'string' ? v : ''} onChange={(e) => onSet(e.target.value)} readOnly={readOnly} aria-label={label} autoFocus={autoFocus} />;
    case 'check':
      return (
        <button
          type="button"
          className="lo-li-check"
          data-bare={f.bare ? '' : undefined}
          data-on={v ? '' : undefined}
          aria-pressed={Boolean(v)}
          aria-label={f.bare ? label : undefined}
          disabled={readOnly}
          onClick={() => onSet(!v)}
        >
          <span className="lo-li-box">
            <IconTick />
          </span>
          {f.bare ? null : <span>{label}</span>}
        </button>
      );
    case 'area':
      return <AutoArea value={v} onChange={onSet} placeholder={f.placeholder} readOnly={readOnly} label={label} autoFocus={autoFocus} rows={f.rows || 2} />;
    default: {
      const href = hrefFor(f.kind, v);
      return (
        <span className="lo-li-text">
          <input
            type={f.kind === 'email' ? 'email' : f.kind === 'tel' ? 'tel' : 'text'}
            className="lo-li-input"
            value={typeof v === 'string' ? v : ''}
            onChange={(e) => onSet(e.target.value)}
            placeholder={f.placeholder}
            readOnly={readOnly}
            aria-label={label}
            autoFocus={autoFocus}
          />
          {href ? (
            <a
              className="lo-li-go"
              href={href}
              {...(f.kind === 'url' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              title={f.kind === 'tel' ? 'Call' : f.kind === 'email' ? 'Email' : 'Open'}
            >
              {f.kind === 'tel' ? <PhoneIcon /> : f.kind === 'email' ? <MailIcon /> : <IconOut />}
            </a>
          ) : null}
        </span>
      );
    }
  }
}

/* ---------- the list ---------- */

function ListInput({ spec, value, onChange, readOnly, ctx }) {
  const items = Array.isArray(value) ? value.filter((x) => x && x._key) : [];
  const [fresh, setFresh] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [leaving, setLeaving] = useState({}); // key → its height, while it animates away
  const nodes = useRef({});
  const variant = spec.variant || 'cards';

  useEffect(() => {
    if (!confirm) return undefined;
    const t = setTimeout(() => setConfirm(null), 3200);
    return () => clearTimeout(t);
  }, [confirm]);

  const add = (preset, opts = {}) => {
    if (readOnly) return;
    const list = (Array.isArray(preset) ? preset : [preset]).map((p) => ({ _type: spec.type, _key: makeKey(), ...(spec.defaults ? spec.defaults(items, ctx || {}) : {}), ...(p || {}) }));
    if (!items.length) onChange([setIfMissing([]), insert(list, 'after', [-1])]);
    else if (spec.newestFirst) onChange(insert(list, 'before', [0]));
    else onChange(insert(list, 'after', [-1]));
    setFresh(opts.quiet ? null : list[list.length - 1]._key);
  };
  const setField = (key, name, v) => {
    if (readOnly) return;
    const empty = v === undefined || v === null || v === '' || v === false;
    onChange(empty ? unset([{ _key: key }, name]) : set(v, [{ _key: key }, name]));
  };
  const remove = (key) => {
    if (readOnly) return;
    if (confirm !== key) {
      setConfirm(key);
      return;
    }
    setConfirm(null);
    removeNow(key);
  };
  // slide it away first, then remove it
  const removeNow = (key) => {
    if (readOnly || leaving[key] !== undefined) return;
    const el = nodes.current[key];
    const calm = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setLeaving((m) => ({ ...m, [key]: el ? el.getBoundingClientRect().height : 0 }));
    setTimeout(
      () => {
        onChange(unset([{ _key: key }]));
        setLeaving((m) => {
          const next = { ...m };
          delete next[key];
          return next;
        });
      },
      calm ? 0 : 420
    );
  };
  const move = (i, dir) => {
    const j = i + dir;
    if (readOnly || j < 0 || j >= items.length) return;
    const it = items[i];
    onChange([unset([{ _key: it._key }]), insert([it], dir < 0 ? 'before' : 'after', [{ _key: items[j]._key }])]);
  };
  const sort = spec.sortBy && !readOnly && items.length > 1 ? () => onChange(set([...items].sort(spec.sortBy))) : null;

  const visible = (it) => spec.fields.filter((f) => !f.when || f.when(it));

  return (
    <div className="lo-li" data-variant={variant} data-list={spec.type}>
      {items.length && variant === 'rows' ? (
        <div className="lo-li-cols" aria-hidden="true">
          {spec.fields.filter((f) => !f.wrap).map((f) => (
            <span key={f.name} style={{ '--span': f.span || 12 }}>
              {f.bare ? '' : typeof f.label === 'function' ? '' : f.label}
            </span>
          ))}
          {spec.total ? <span className="lo-li-cols-total">Total</span> : null}
          <span className="lo-li-cols-acts" />
        </div>
      ) : null}

      {items.length ? (
        <ol className="lo-li-list">
          {items.map((it, i) => {
            const fields = visible(it);
            // a new item puts the cursor in its first empty box (e.g. the miles, after "Mileage")
            const typeable = (f) => f.kind !== 'check';
            const empty = fields.findIndex((f) => typeable(f) && (it[f.name] === undefined || it[f.name] === ''));
            const focusAt = empty >= 0 ? empty : fields.findIndex(typeable);
            const asking = confirm === it._key;
            const acts = (
              <span className="lo-li-acts" data-confirming={asking ? '' : undefined}>
                {items.length > 1 && !spec.noMove && !readOnly ? (
                  <>
                    <button type="button" className="lo-li-act" data-dir="up" onClick={() => move(i, -1)} disabled={i === 0 || asking} aria-label="Move up" title="Move up">
                      <IconUp />
                    </button>
                    <button type="button" className="lo-li-act" data-dir="down" onClick={() => move(i, 1)} disabled={i === items.length - 1 || asking} aria-label="Move down" title="Move down">
                      <IconDown />
                    </button>
                  </>
                ) : null}
                {!readOnly ? (
                  <button
                    type="button"
                    className="lo-li-act lo-li-del"
                    data-confirm={asking ? '' : undefined}
                    onClick={() => remove(it._key)}
                    aria-label={asking ? 'Click again to remove' : 'Remove'}
                    title={asking ? 'Click again to remove' : 'Remove'}
                  >
                    <IconX />
                    <span className="lo-li-del-say" aria-hidden={asking ? undefined : 'true'}>
                      Remove?
                    </span>
                  </button>
                ) : null}
              </span>
            );
            return (
              <li
                key={it._key}
                ref={(el) => {
                  nodes.current[it._key] = el;
                }}
                className="lo-li-item"
                data-fresh={fresh === it._key ? '' : undefined}
                data-done={spec.isDone && spec.isDone(it) ? '' : undefined}
                data-leaving={leaving[it._key] !== undefined ? '' : undefined}
                style={{ '--i': Math.min(i, 12), ...(leaving[it._key] !== undefined ? { '--h': `${leaving[it._key]}px` } : {}) }}
              >
                {spec.head ? (
                  <div className="lo-li-head">
                    {spec.badge ? spec.badge(it, i) : null}
                    <span className="lo-li-title">{spec.head(it, i)}</span>
                    {spec.total ? <span className="lo-li-total">{spec.total(it)}</span> : null}
                    {acts}
                  </div>
                ) : null}
                <div className="lo-li-grid">
                  {fields.map((f, fi) => {
                    const label = typeof f.label === 'function' ? f.label(it) : f.label;
                    return (
                      <div key={f.name} className="lo-li-cell" data-kind={f.kind} style={{ '--span': f.span || 12 }}>
                        {f.kind !== 'check' && variant !== 'rows' ? <span className="lo-li-label">{label}</span> : null}
                        <Control f={f} item={it} label={label} readOnly={readOnly} autoFocus={fresh === it._key && fi === focusAt} onSet={(v) => setField(it._key, f.name, v)} />
                      </div>
                    );
                  })}
                  {!spec.head && spec.total ? <span className="lo-li-total">{spec.total(it)}</span> : null}
                  {!spec.head ? acts : null}
                </div>
                {spec.extra ? spec.extra(it) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="lo-li-empty">{spec.empty}</div>
      )}

      {!readOnly ? (
        <div className="lo-li-bar">
          <button type="button" className="lo-li-add" onClick={() => add()}>
            <IconPlus /> {spec.addLabel}
          </button>
          {(spec.quick || []).map((q) => (
            <button key={q.label} type="button" className="lo-li-chip" onClick={() => add(q.preset)}>
              {q.label}
            </button>
          ))}
          {sort ? (
            <button type="button" className="lo-li-chip" data-quiet="" onClick={sort}>
              {spec.sortLabel || 'Sort'}
            </button>
          ) : null}
        </div>
      ) : null}

      {spec.picker && !readOnly ? spec.picker(items, ctx || {}, { add, removeNow, onChange }) : null}

      {spec.footer ? <div className="lo-li-foot">{spec.footer(items, ctx || {})}</div> : null}
    </div>
  );
}

/* ---------- the lists on a shoot ---------- */

const UNIT_OPTIONS = UNITS.filter((u) => u.value !== 'item');

function Amount({ value, clientPays, paid }) {
  if (!value) return <span className="lo-li-amt" data-zero="">£0</span>;
  return (
    <span className="lo-li-amt" data-client={clientPays ? '' : undefined}>
      {money(value)}
      {clientPays ? <small>client pays</small> : paid ? <small>paid</small> : null}
    </span>
  );
}

const LOCATIONS = {
  type: 'location',
  addLabel: 'Add a location',
  empty: 'No locations yet. Add the studio, venue or outdoor spot you’re shooting at, with the address, who to ask for and any hire fee.',
  quick: [
    { label: 'Studio', preset: { kind: 'studio' } },
    { label: 'Client’s premises', preset: { kind: 'client' } },
    { label: 'Outdoors', preset: { kind: 'outdoor' } },
  ],
  badge: (it, i) => <span className="lo-li-num-badge">{i + 1}</span>,
  head: (it, i) => it.name || (LOCATION_TYPES.find((t) => t.value === it.kind) || { title: `Location ${i + 1}` }).title,
  total: (it) => (typeof it.hireFee === 'number' && it.hireFee ? <Amount value={it.hireFee} clientPays={it.clientPays} paid={it.paid} /> : null),
  fields: [
    { name: 'name', kind: 'text', label: 'Place', span: 7, placeholder: 'e.g. Brighton seafront' },
    { name: 'kind', kind: 'select', label: 'Type', options: LOCATION_TYPES, span: 5 },
    { name: 'address', kind: 'area', label: 'Address', span: 12, placeholder: 'Street, town and postcode' },
    { name: 'contact', kind: 'text', label: 'Contact there', span: 6, placeholder: 'e.g. Tom, the venue manager' },
    { name: 'phone', kind: 'tel', label: 'Their phone', span: 6, placeholder: 'e.g. 07700 900123' },
    { name: 'hireFee', kind: 'money', label: 'Hire fee', span: 4, placeholder: '0' },
    { name: 'paid', kind: 'check', label: 'Paid', span: 3 },
    { name: 'clientPays', kind: 'check', label: 'Client pays this', span: 5 },
    { name: 'notes', kind: 'area', label: 'Access, parking & permits', span: 12, placeholder: 'e.g. Park round the back · power by the stage · permit booked' },
  ],
  extra: (it) => {
    const q = [it.name, it.address].filter(Boolean).join(', ');
    return q ? (
      <a className="lo-li-map" href={mapsUrl(q)} target="_blank" rel="noopener noreferrer">
        <IconPin /> Open in Google Maps <IconOut />
      </a>
    ) : null;
  },
};

const PEOPLE = {
  type: 'person',
  addLabel: 'Add someone',
  empty: 'Nobody added yet. Add models, actors, assistants and makeup artists, with their contact details and fee.',
  quick: [
    { label: 'Model', preset: { role: 'model' } },
    { label: 'Actor', preset: { role: 'actor' } },
    { label: 'Assistant', preset: { role: 'assistant' } },
    { label: 'Hair & makeup', preset: { role: 'hmua' } },
    { label: 'Stylist', preset: { role: 'stylist' } },
    { label: 'Second shooter', preset: { role: 'second' } },
    { label: 'Client contact', preset: { role: 'contact', rateUnit: 'flat' } },
  ],
  badge: (it) => <span className="lo-li-avatar">{initials(it.name || (roleOf(it.role) || {}).title)}</span>,
  head: (it) => (
    <>
      {it.name || 'New person'}
      {roleOf(it.role) ? <small>{roleOf(it.role).title}</small> : null}
      {it.release ? <small data-ok="">Release signed</small> : null}
    </>
  ),
  total: (it) => (personCost(it) ? <Amount value={personCost(it)} clientPays={it.clientPays} paid={it.paid} /> : null),
  fields: [
    { name: 'role', kind: 'select', label: 'Role', options: ROLES, span: 4 },
    { name: 'name', kind: 'text', label: 'Name', span: 4, placeholder: 'e.g. Jess Moore' },
    { name: 'agency', kind: 'text', label: 'Agency', span: 4, placeholder: 'If booked through one' },
    { name: 'phone', kind: 'tel', label: 'Phone', span: 6, placeholder: 'e.g. 07700 900123' },
    { name: 'email', kind: 'email', label: 'Email', span: 6, placeholder: 'name@email.com' },
    { name: 'rate', kind: 'money', label: 'Their rate', span: 4, placeholder: '0' },
    { name: 'rateUnit', kind: 'select', label: 'Rate is', options: RATE_UNITS.filter((r) => r.value !== 'day'), emptyLabel: 'per day', span: 4 },
    { name: 'qty', kind: 'number', label: (it) => (it.rateUnit === 'hour' ? 'Hours' : 'Days'), span: 4, placeholder: '1', when: (it) => it.rateUnit !== 'flat' },
    { name: 'release', kind: 'check', label: 'Release form signed', span: 4 },
    { name: 'paid', kind: 'check', label: 'Paid', span: 3 },
    { name: 'clientPays', kind: 'check', label: 'Client pays this', span: 5 },
    { name: 'notes', kind: 'text', label: 'Notes', span: 12, placeholder: 'Call time, sizes, dietary needs…' },
  ],
};

const QUOTE = {
  type: 'quoteLine',
  variant: 'rows',
  addLabel: 'Add a line',
  empty: 'No price yet. Add a line for each thing you’re charging for and the total works itself out.',
  quick: [
    { label: 'Full day', preset: { label: 'Full-day shoot', qty: 1 } },
    { label: 'Half day', preset: { label: 'Half-day shoot', qty: 1 } },
    { label: 'Editing', preset: { label: 'Editing' } },
    { label: 'Extra photos', preset: { label: 'Extra edited photos' } },
    { label: 'Video edit', preset: { label: 'Video edit' } },
    { label: 'Travel', preset: { label: 'Travel' } },
    { label: 'Discount', preset: { label: 'Discount' } },
  ],
  fields: [
    { name: 'label', kind: 'text', label: 'What for', span: 6, placeholder: 'e.g. Full-day shoot' },
    { name: 'qty', kind: 'number', label: 'Qty', span: 2, placeholder: '1' },
    { name: 'rate', kind: 'money', label: 'Price each', span: 4, placeholder: '0' },
  ],
  total: (it) => <Amount value={lineTotal(it)} />,
  picker: (items, ctx, api) => <RechargePicker items={items} doc={ctx.doc || {}} b={ctx} api={api} />,
  footer: (items, b) => (
    <>
      <span>Total price</span>
      <b>{money(b.income)}</b>
      {b.budget && b.income ? (
        <em data-tone={b.income > b.budget ? 'warn' : 'ok'}>
          {b.income > b.budget ? `${money(b.income - b.budget)} over` : `${money(b.budget - b.income)} under`} their {money(b.budget)} budget
        </em>
      ) : null}
    </>
  ),
};

const COSTS = {
  type: 'costLine',
  addLabel: 'Add a cost',
  empty: 'No other costs yet. Add anything you’ll pay for: studio or kit hire, travel, props, food.',
  quick: [
    { label: 'Studio hire', preset: { category: 'studio', label: 'Studio hire', unit: 'day' } },
    { label: 'Kit hire', preset: { category: 'kit', label: 'Equipment hire', unit: 'day' } },
    { label: 'Mileage', preset: { category: 'travel', label: 'Mileage', unit: 'mile', rate: 0.45 } },
    { label: 'Train / fuel', preset: { category: 'travel', label: 'Travel' } },
    { label: 'Parking', preset: { category: 'travel', label: 'Parking' } },
    { label: 'Hotel', preset: { category: 'stay', label: 'Hotel', unit: 'night' } },
    { label: 'Food & drink', preset: { category: 'food', label: 'Food & drink', unit: 'person' } },
    { label: 'Props', preset: { category: 'props', label: 'Props' } },
    { label: 'Wardrobe', preset: { category: 'props', label: 'Wardrobe' } },
    { label: 'Permit', preset: { category: 'permits', label: 'Filming permit' } },
    { label: 'Insurance', preset: { category: 'permits', label: 'Insurance' } },
    { label: 'Retouching', preset: { category: 'post', label: 'Retouching' } },
    { label: 'Music licence', preset: { category: 'music', label: 'Music licence' } },
  ],
  head: (it) => (
    <>
      {it.label || (it.category ? categoryTitle(it.category) : 'New cost')}
      {it.category && it.label ? <small>{categoryTitle(it.category)}</small> : null}
    </>
  ),
  total: (it) => <Amount value={lineTotal(it)} clientPays={it.clientPays} paid={it.paid} />,
  fields: [
    { name: 'category', kind: 'select', label: 'Type', options: COST_CATEGORIES, span: 4 },
    { name: 'label', kind: 'text', label: 'What / who', span: 8, placeholder: 'e.g. Extra lights hired for the day' },
    { name: 'qty', kind: 'number', label: 'Quantity', span: 3, placeholder: '1' },
    { name: 'unit', kind: 'select', label: 'Per', options: UNIT_OPTIONS, emptyLabel: 'each', span: 3 },
    { name: 'rate', kind: 'money', label: 'Cost', span: 3, placeholder: '0' },
    { name: 'paid', kind: 'check', label: 'Paid', span: 3 },
    { name: 'clientPays', kind: 'check', label: 'Client pays this', span: 4 },
    { name: 'notes', kind: 'text', label: 'Notes', span: 8, placeholder: 'Supplier, booking ref, contact…' },
  ],
  footer: (items, b) => {
    const other = items.filter((c) => !c.clientPays).reduce((a, c) => a + lineTotal(c), 0);
    return (
      <>
        <span>Other costs</span>
        <b>{money(other)}</b>
        <em>
          All costs, with locations and people: <strong>{money(b.costs)}</strong>
          {b.covered ? ` · ${money(b.covered)} paid by the client` : ''}
        </em>
      </>
    );
  },
};

const PAYMENTS = {
  type: 'payment',
  variant: 'rows',
  addLabel: 'Add a payment',
  empty: 'Nothing received yet.',
  defaults: () => ({ date: todayYmd() }),
  quick: [
    { label: 'Deposit', preset: { label: 'Deposit' } },
    { label: 'Final payment', preset: { label: 'Final payment' } },
  ],
  fields: [
    { name: 'date', kind: 'date', label: 'Date', span: 4 },
    { name: 'label', kind: 'text', label: 'What for', span: 4, placeholder: 'e.g. Deposit' },
    { name: 'amount', kind: 'money', label: 'Amount', span: 4, placeholder: '0' },
  ],
  footer: (items, b) =>
    b.income ? (
      b.payState === 'paid' ? (
        <>
          <span>Paid in full</span>
          <b>{money(b.paid)}</b>
          <em data-tone="ok">Nothing left to chase</em>
        </>
      ) : (
        <>
          <span>Still to come in</span>
          <b>{money(b.outstanding)}</b>
          <em>
            {money(b.paid)} of {money(b.income)} paid
          </em>
        </>
      )
    ) : (
      <>
        <span>Received</span>
        <b>{money(b.paid)}</b>
        <em>Add your price under “What you’re charging” to see what’s still owed.</em>
      </>
    ),
};

const SCHEDULE = {
  type: 'slot',
  variant: 'rows',
  addLabel: 'Add a time',
  empty: 'No schedule yet. Add when everyone arrives and what happens when.',
  quick: [
    { label: 'Arrive & set up', preset: { text: 'Arrive & set up' } },
    { label: 'Talent arrives', preset: { text: 'Talent arrives' } },
    { label: 'Hair & makeup', preset: { text: 'Hair & makeup' } },
    { label: 'Lunch', preset: { text: 'Lunch' } },
    { label: 'Move location', preset: { text: 'Move to next location' } },
    { label: 'Wrap', preset: { text: 'Wrap' } },
  ],
  sortBy: (a, b) => String(a.time || '99').localeCompare(String(b.time || '99')),
  sortLabel: 'Sort by time',
  fields: [
    { name: 'time', kind: 'time', label: 'Time', span: 3 },
    { name: 'text', kind: 'text', label: 'What’s happening', span: 9, placeholder: 'e.g. Arrive & set up' },
  ],
};

const SHOTS = {
  type: 'shot',
  variant: 'rows',
  addLabel: 'Add a shot',
  empty: 'No shots listed yet.',
  isDone: (it) => Boolean(it.done),
  fields: [
    { name: 'done', kind: 'check', label: 'Got it', bare: true, span: 1 },
    { name: 'text', kind: 'text', label: 'Shot', span: 11, placeholder: 'e.g. Wide of the shop front with the sign lit' },
  ],
  footer: (items) => {
    const done = items.filter((s) => s.done).length;
    return items.length ? (
      <>
        <span>Shots done</span>
        <b>
          {done} of {items.length}
        </b>
        {done === items.length ? <em data-tone="ok">All got</em> : null}
      </>
    ) : null;
  },
};

const NOTES = {
  type: 'note',
  variant: 'notes',
  addLabel: 'Add a note',
  newestFirst: true,
  noMove: true,
  empty: 'No notes yet. Whenever they tell you something (a change of plan, a preference, a new idea), add it here with the date.',
  defaults: () => ({ date: todayYmd() }),
  fields: [
    { name: 'date', kind: 'date', label: 'Date', span: 4 },
    { name: 'text', kind: 'area', label: 'What they said', span: 12, rows: 2, placeholder: 'e.g. Wants a few shots of the new shop front too' },
  ],
};

const LINKS = {
  type: 'link',
  variant: 'rows',
  addLabel: 'Add a link',
  empty: 'No links yet. Paste in moodboards, contracts, invoices or the delivery gallery.',
  quick: [
    { label: 'Moodboard', preset: { kind: 'moodboard', label: 'Moodboard' } },
    { label: 'Contract', preset: { kind: 'contract', label: 'Contract' } },
    { label: 'Invoice', preset: { kind: 'invoice', label: 'Invoice' } },
    { label: 'Gallery', preset: { kind: 'gallery', label: 'Delivery gallery' } },
  ],
  fields: [
    { name: 'kind', kind: 'select', label: 'Type', options: LINK_KINDS, span: 3 },
    { name: 'label', kind: 'text', label: 'Name', span: 4, placeholder: 'e.g. Moodboard' },
    { name: 'url', kind: 'url', label: 'Link', span: 5, placeholder: 'Paste the link' },
  ],
};

const MORE_DAYS = {
  type: 'shootDay',
  variant: 'rows',
  addLabel: 'Add another day',
  empty: 'Just the one day. Shooting over more than one? Add each extra day here.',
  // the next day after the last one, at the same times, change anything you need
  defaults: (items, doc) => {
    const last = [doc.date, ...items.map((d) => d.date)].filter(Boolean).sort().pop();
    return { date: last ? addDays(last, 1) : undefined, startTime: doc.startTime || undefined, endTime: doc.endTime || undefined };
  },
  sortBy: (a, b) => String(a.date || '9').localeCompare(String(b.date || '9')),
  sortLabel: 'Sort by date',
  fields: [
    { name: 'date', kind: 'date', label: 'Day', span: 6 },
    { name: 'startTime', kind: 'time', label: 'Start', span: 3 },
    { name: 'endTime', kind: 'time', label: 'Finish', span: 3 },
    { name: 'note', kind: 'text', label: 'Note', span: 12, wrap: true, placeholder: 'Note for this day (optional), e.g. second location' },
  ],
};

const useBudget = () => computeBudget(useFormValue([]));

export const LocationsInput = (props) => <ListInput {...props} spec={LOCATIONS} />;
export const PeopleInput = (props) => <ListInput {...props} spec={PEOPLE} />;
export const ShotListInput = (props) => <ListInput {...props} spec={SHOTS} />;
export const NotesInput = (props) => <ListInput {...props} spec={NOTES} />;
export const LinksInput = (props) => <ListInput {...props} spec={LINKS} />;
export function MoreDaysInput(props) {
  const doc = useFormValue([]) || {};
  return <ListInput {...props} spec={MORE_DAYS} ctx={doc} />;
}
export function QuoteInput(props) {
  const doc = useFormValue([]) || {};
  const b = computeBudget(doc);
  return <ListInput {...props} spec={QUOTE} ctx={{ ...b, doc }} />;
}
/** on a shoot over more than one day, each time says which day it's for (it shows on that day in the calendar) */
/* a new time on the schedule: half an hour after the last one that day, or the day's start time */
const halfHourAfter = (t) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t || ''));
  if (!m) return '';
  const total = Math.min(23 * 60 + 30, Number(m[1]) * 60 + Number(m[2]) + 30);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
function nextScheduleTime(items, doc, days, dayNo) {
  const n = parseInt(dayNo, 10) || 1;
  const same = items.filter((s) => s && (parseInt(s.dayNo, 10) || 1) === n && /^\d{1,2}:\d{2}/.test(String(s.time || '')));
  const latest = same.map((s) => s.time).sort().pop();
  if (latest) return halfHourAfter(latest);
  const day = days[n - 1];
  return (day && dayInfo(doc, day).start) || doc.startTime || '';
}

export function ScheduleInput(props) {
  const doc = useFormValue([]) || {};
  const days = shootDays(doc);
  const key = `${days.join(',')}|${doc.startTime || ''}|${(Array.isArray(doc.moreDays) ? doc.moreDays : []).map((d) => d && d.startTime).join(',')}`;
  const spec = useMemo(() => {
    if (days.length < 2) {
      return {
        ...SCHEDULE,
        defaults: (items) => {
          const time = nextScheduleTime(items, doc, days, '1');
          return time ? { time } : {};
        },
      };
    }
    const dayOf = (s) => parseInt(s && s.dayNo, 10) || 1;
    return {
      ...SCHEDULE,
      defaults: (items) => {
        const last = items[items.length - 1];
        const dayNo = last && last.dayNo ? last.dayNo : '';
        const time = nextScheduleTime(items, doc, days, dayNo || '1');
        return { ...(dayNo ? { dayNo } : {}), ...(time ? { time } : {}) };
      },
      sortBy: (a, b) => dayOf(a) - dayOf(b) || String(a.time || '99').localeCompare(String(b.time || '99')),
      sortLabel: 'Sort by day and time',
      fields: [
        { name: 'dayNo', kind: 'select', label: 'Day', options: days.slice(1).map((d, i) => ({ value: String(i + 2), title: shortDay(d) })), emptyLabel: shortDay(days[0]), span: 3 },
        { name: 'time', kind: 'time', label: 'Time', span: 3 },
        { name: 'text', kind: 'text', label: 'What’s happening', span: 6, placeholder: 'e.g. Arrive & set up' },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <ListInput {...props} spec={spec} />;
}

/* ---------- "From this shoot": put what you're paying for on the client's bill ---------- */

const PICK_SOURCES = {
  locations: { title: 'Location', Icon: IconPin },
  people: { title: 'Cast & crew', Icon: IconUser },
  costs: { title: 'Other cost', Icon: IconTag },
};
function rechargeLabel(doc, it) {
  if (it.source === 'locations') return `Location hire: ${it.label}`;
  if (it.source === 'people') {
    const p = (Array.isArray(doc.people) ? doc.people : []).find((x) => x && x._key === it.key) || {};
    const role = roleOf(p.role);
    if (p.name) return role ? `${role.title}: ${p.name}` : p.name;
    return role ? role.title : 'Cast & crew';
  }
  return it.label;
}
function RechargePicker({ items, doc, b, api }) {
  const picks = (b.items || []).filter((it) => !it.clientPays && it.amount > 0);
  const lineFor = (p) => items.find((l) => l.from === `${p.source}:${p.key}`);
  if (!picks.length) {
    return (
      <div className="lo-rc" data-empty="">
        <span className="lo-rc-say">Add a hire fee under Locations or a rate under People, and you can put it on the client’s bill from here in one tap.</span>
      </div>
    );
  }
  const toLine = (p) => ({ label: rechargeLabel(doc, p), qty: 1, rate: p.amount, from: `${p.source}:${p.key}`, fromAmount: p.amount });
  const waiting = picks.filter((p) => !lineFor(p));
  const toggle = (p) => {
    const line = lineFor(p);
    if (!line) return api.add(toLine(p), { quiet: true });
    if (typeof line.fromAmount === 'number' && line.fromAmount !== p.amount) {
      // the cost changed since you added it: move the price by the same amount, so any mark-up stays
      const qty = typeof line.qty === 'number' && line.qty > 0 ? line.qty : 1;
      const rate = Math.round(((lineTotal(line) + (p.amount - line.fromAmount)) / qty) * 100) / 100;
      return api.onChange([set(rate, [{ _key: line._key }, 'rate']), set(p.amount, [{ _key: line._key }, 'fromAmount'])]);
    }
    return api.removeNow(line._key);
  };
  return (
    <div className="lo-rc">
      <div className="lo-rc-head">
        <span className="lo-rc-title">From this shoot</span>
        <span className="lo-rc-say">What you’re paying for. Tap one to put it on the client’s bill, tap again to take it off.</span>
        {waiting.length > 1 ? (
          <button type="button" className="lo-rc-all" onClick={() => api.add(waiting.map(toLine), { quiet: true })}>
            <IconPlus /> Add all
          </button>
        ) : null}
      </div>
      <div className="lo-rc-picks">
        {picks.map((p, i) => {
          const line = lineFor(p);
          const stale = Boolean(line) && typeof line.fromAmount === 'number' && line.fromAmount !== p.amount;
          const src = PICK_SOURCES[p.source] || PICK_SOURCES.costs;
          return (
            <button
              key={`${p.source}:${p.key}`}
              type="button"
              className="lo-rc-pick"
              data-on={line ? '' : undefined}
              data-stale={stale ? '' : undefined}
              aria-pressed={Boolean(line)}
              onClick={() => toggle(p)}
              style={{ '--i': i }}
              title={stale ? `Now ${money(p.amount)}: tap to update their bill` : line ? 'On their bill. Tap to take it off' : 'Add it to their bill'}
            >
              <span className="lo-rc-ic">
                <src.Icon />
              </span>
              <span className="lo-rc-text">
                <b>{p.label}</b>
                <small>{stale ? `Now ${money(p.amount)}, tap to update` : line ? 'On their bill' : src.title}</small>
              </span>
              <span className="lo-rc-amt">{money(p.amount)}</span>
              <span className="lo-rc-state" aria-hidden="true">
                {line && !stale ? <IconTick /> : <IconPlus />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
export function CostsInput(props) {
  const b = useBudget();
  return <ListInput {...props} spec={COSTS} ctx={b} />;
}
export function PaymentsInput(props) {
  const b = useBudget();
  return <ListInput {...props} spec={PAYMENTS} ctx={b} />;
}

/* ---------- the numbers ---------- */

const TONES = ['#0b1220', '#2b3d66', '#46608f', '#6f87b8', '#9fb2da', '#c9d6f0', '#56607a', '#8e9ab3', '#b9c2d4', '#dfe5f1'];

export function BudgetSummaryInput() {
  const doc = useFormValue([]) || {};
  const b = computeBudget(doc);
  const scale = Math.max(b.income, b.costs, 1);
  const segs = b.byCategory.map((c, i) => ({ ...c, color: TONES[i % TONES.length], w: (c.amount / scale) * 100 }));
  const profitW = b.profit > 0 ? (b.profit / scale) * 100 : 0;
  const nothing = !b.income && !b.items.length;

  const facts = [];
  if (b.budget) {
    if (!b.income) facts.push({ tone: '', text: `Their budget is ${money(b.budget)}` });
    else if (b.income <= b.budget) facts.push({ tone: 'ok', text: `${money(b.budget - b.income)} under their ${money(b.budget)} budget` });
    else facts.push({ tone: 'warn', text: `${money(b.income - b.budget)} over their ${money(b.budget)} budget` });
  }
  if (b.income) {
    if (b.payState === 'paid') facts.push({ tone: 'ok', text: 'Paid in full' });
    else if (b.paid) facts.push({ tone: '', text: `${money(b.paid)} paid · ${money(b.outstanding)} still to come in` });
    else facts.push({ tone: '', text: `Nothing paid yet · ${money(b.income)} to come in` });
  }
  if (b.toPayOut) facts.push({ tone: '', text: `${money(b.toPayOut)} of your costs still to pay out` });
  if (b.covered) facts.push({ tone: '', text: `${money(b.covered)} paid by the client directly, so not in your costs` });
  const passedOn = (Array.isArray(doc.quote) ? doc.quote : []).filter((l) => l && l.from).reduce((a, l) => a + lineTotal(l), 0);
  if (passedOn) facts.push({ tone: '', text: `${money(passedOn)} of the price is costs you’re passing on` });
  if (b.days > 1 && b.income) facts.push({ tone: '', text: `${money(b.profit / b.days)} profit per shoot day, over ${b.days} days` });

  return (
    <div className="lo-sum" data-empty={nothing ? '' : undefined}>
      <div className="lo-sum-figs">
        <div className="lo-sum-fig">
          <span>You’re charging</span>
          <b>{money(b.income)}</b>
        </div>
        <span className="lo-sum-op" aria-hidden="true">−</span>
        <div className="lo-sum-fig">
          <span>Your costs</span>
          <b>{money(b.costs)}</b>
        </div>
        <span className="lo-sum-op" aria-hidden="true">=</span>
        <div className="lo-sum-fig" data-main="" data-neg={b.profit < 0 ? '' : undefined}>
          <span>{b.profit < 0 ? 'You’d lose' : 'You make'}</span>
          <b>{money(Math.abs(b.profit))}</b>
          <em>{b.margin !== null ? `${percent(b.margin)} margin` : 'add your price'}</em>
        </div>
      </div>

      {nothing ? (
        <p className="lo-sum-empty">Add your price under “What you’re charging”, then your costs. Location and people fees come in from their tabs. Everything here works itself out.</p>
      ) : (
        <>
          <div className="lo-sum-bar" role="img" aria-label={`Costs ${money(b.costs)}, profit ${money(b.profit)}`}>
            {segs.map((s) => (
              <span key={s.category} className="lo-sum-seg" style={{ width: `${s.w}%`, background: s.color }} title={`${s.title}: ${money(s.amount)}`} />
            ))}
            {profitW ? <span className="lo-sum-seg" data-profit="" style={{ width: `${profitW}%` }} title={`Profit: ${money(b.profit)}`} /> : null}
          </div>
          <ul className="lo-sum-cats">
            {segs.map((s) => (
              <li key={s.category}>
                <i style={{ background: s.color }} />
                <span>
                  {s.title}
                  {s.count > 1 ? <small> · {s.count}</small> : null}
                </span>
                <b>{money(s.amount)}</b>
                <em>{b.income ? percent(s.amount / b.income) : ''}</em>
              </li>
            ))}
            {b.profit > 0 ? (
              <li data-profit="">
                <i />
                <span>Your profit</span>
                <b>{money(b.profit)}</b>
                <em>{percent(b.margin)}</em>
              </li>
            ) : null}
          </ul>
          {facts.length ? (
            <ul className="lo-sum-facts">
              {facts.map((f) => (
                <li key={f.text} data-tone={f.tone || undefined}>
                  {f.text}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ---------- who it's for ---------- */

const PICK_QUERY = `{
  "enquiries": *[_type == "enquiry"] | order(receivedAt desc)[0...120]{ _id, name, company, email, phone, service, budget, details, receivedAt, replied, declined },
  "booked": *[_type == "booking" && defined(client.enquiry._ref)]{ _id, "ref": client.enquiry._ref }
}`;

function EnquiryPicker({ onPick, onCancel, readOnly, selfId }) {
  const client = useClient({ apiVersion: '2024-10-01' });
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    client
      .fetch(PICK_QUERY)
      .then((res) => alive && setData(res || { enquiries: [], booked: [] }))
      .catch(() => alive && setData({ enquiries: [], booked: [] }));
    return () => {
      alive = false;
    };
  }, [client]);

  const booked = useMemo(() => {
    const m = new Map();
    ((data && data.booked) || []).forEach((b) => {
      if (String(b._id).replace(/^drafts\./, '') === selfId) return;
      m.set(b.ref, (m.get(b.ref) || 0) + 1);
    });
    return m;
  }, [data, selfId]);

  const list = useMemo(() => {
    const all = latestById(data && data.enquiries).sort((a, b) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || '')));
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter((e) => [e.name, e.company, e.email, e.service].some((x) => typeof x === 'string' && x.toLowerCase().includes(term)));
  }, [data, q]);

  return (
    <div className="lo-match">
      <div className="lo-match-head">
        <div>
          <span className="lo-match-title">Match an enquiry</span>
          <span className="lo-match-text">Pick who this shoot is for. Their name, contact details, budget and message fill in for you.</span>
        </div>
        {onCancel ? (
          <button type="button" className="lo-mini-btn" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
      <input className="lo-match-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, business or email" aria-label="Search enquiries" />
      <div className="lo-match-list">
        {data === null ? (
          <p className="lo-match-none">Loading your enquiries…</p>
        ) : list.length ? (
          list.slice(0, 8).map((e, i) => {
            const n = booked.get(e._baseId) || 0;
            return (
              <button key={e._baseId} type="button" className="lo-match-item" onClick={() => onPick(e)} disabled={readOnly} style={{ '--i': i }}>
                <span className="lo-avatar">{initials(e.name || e.company)}</span>
                <span className="lo-match-main">
                  <span className="lo-match-name">
                    {e.name || 'Unknown'}
                    {e.company ? <span> · {e.company}</span> : null}
                  </span>
                  <span className="lo-match-meta">{[e.service, tidyRange(e.budget), e.receivedAt ? fmtDay(e.receivedAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }) : ''].filter(Boolean).join(' · ')}</span>
                  {e.details ? <span className="lo-match-snip">{e.details}</span> : null}
                </span>
                {n ? (
                  <span className="lo-match-tag">Booked{n > 1 ? ` ×${n}` : ''}</span>
                ) : e.declined ? (
                  <span className="lo-match-tag">Not going ahead</span>
                ) : !e.replied ? (
                  <span className="lo-match-tag" data-new="">
                    New
                  </span>
                ) : null}
              </button>
            );
          })
        ) : (
          <p className="lo-match-none">{q ? 'No enquiries match that.' : 'No enquiries yet. They arrive here from the contact form on your website.'}</p>
        )}
      </div>
    </div>
  );
}

export function ClientInput(props) {
  const { value, onChange, readOnly } = props;
  const v = value && typeof value === 'object' ? value : {};
  const ref = v.enquiry && v.enquiry._ref;
  const docId = String(useFormValue(['_id']) || '').replace(/^drafts\./, '');
  const client = useClient({ apiVersion: '2024-10-01' });
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(false);

  const pick = (e) => {
    const next = clientFromEnquiry(e._baseId || e._id, e);
    const patches = [setIfMissing({})];
    // contact details: take theirs. Linking for the first time keeps anything you've typed that the
    // enquiry doesn't have; switching to a different enquiry replaces the old client's details.
    const switching = Boolean(ref) && ref !== next.enquiry._ref;
    ['name', 'company', 'email', 'phone'].forEach((k) => {
      if (next[k] !== undefined) patches.push(set(next[k], [k]));
      else if (switching) patches.push(unset([k]));
    });
    // the enquiry's own details always come from the enquiry
    ['service', 'budget', 'message', 'enquiredAt'].forEach((k) => patches.push(next[k] !== undefined ? set(next[k], [k]) : unset([k])));
    patches.push(set(next.enquiry, ['enquiry']));
    onChange(patches);
    setPicking(false);
    setEditing(false);
    // the enquiry now has a shoot, so it's ticked off
    tickEnquiry(client, next.enquiry._ref);
  };

  const when = v.enquiredAt ? new Date(v.enquiredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <div className="lo-client">
      {ref && !picking ? (
        <div className="lo-client-card">
          <div className="lo-client-top">
            <span className="lo-avatar" data-size="lg">
              {initials(v.name || v.company)}
            </span>
            <span className="lo-client-who">
              <span className="lo-client-name">{v.name || 'No name yet'}</span>
              {v.company ? <span className="lo-client-co">{v.company}</span> : null}
            </span>
            <span className="lo-client-linked">
              <span className="lo-status-dot" aria-hidden="true" /> From their enquiry
            </span>
          </div>
          {v.email || v.phone ? (
            <div className="lo-client-contact">
              {v.email ? (
                <a className="lo-pill" href={`mailto:${v.email}`}>
                  <MailIcon /> {v.email}
                </a>
              ) : null}
              {v.phone ? (
                <a className="lo-pill" href={`tel:${String(v.phone).replace(/[^\d+]/g, '')}`}>
                  <PhoneIcon /> {v.phone}
                </a>
              ) : null}
            </div>
          ) : null}
          {v.service || v.budget || when ? (
            <dl className="lo-client-facts">
              {v.service ? (
                <div>
                  <dt>Asked about</dt>
                  <dd>{v.service}</dd>
                </div>
              ) : null}
              {v.budget ? (
                <div>
                  <dt>Their budget</dt>
                  <dd>{tidyRange(v.budget)}</dd>
                </div>
              ) : null}
              {when ? (
                <div>
                  <dt>Enquired</dt>
                  <dd>{when}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {v.message ? (
            <blockquote className="lo-client-quote">
              <span className="lo-client-quote-label">Their message</span>
              {v.message}
            </blockquote>
          ) : null}
          <div className="lo-client-actions">
            <button type="button" className="lo-mini-btn" data-on={editing ? '' : undefined} onClick={() => setEditing(!editing)}>
              {editing ? 'Done editing' : 'Edit details'}
            </button>
            <IntentLink intent="edit" params={{ id: ref, type: 'enquiry' }} className="lo-mini-btn">
              View enquiry
            </IntentLink>
            {!readOnly ? (
              <>
                <button type="button" className="lo-mini-btn" onClick={() => setPicking(true)}>
                  Change
                </button>
                <button type="button" className="lo-mini-btn" data-quiet="" onClick={() => onChange(unset(['enquiry']))}>
                  Unlink
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <EnquiryPicker onPick={pick} onCancel={ref ? () => setPicking(false) : null} readOnly={readOnly} selfId={docId} />
      )}
      {!ref || editing ? (
        <div className="lo-client-fields">
          {!ref ? <p className="lo-client-or">Not from an enquiry? Just fill in their details here.</p> : null}
          {props.renderDefault(props)}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- email reminders ---------- */

const REMIND_TO = 'contact@louisoliver.co.uk';
const shortDay = (d) => fmtDay(d, { weekday: 'short', day: 'numeric', month: 'short' });

export function RemindersInput(props) {
  const { value, onChange, readOnly } = props;
  const doc = useFormValue([]) || {};
  const id = String(doc._id || '').replace(/^drafts\./, '');
  const chosen = Array.isArray(value) ? value.map(String) : [];
  const today = todayYmd();
  const plan = reminderPlan({ ...doc, reminders: chosen }, today);
  const hasDate = reminderDays(doc).length > 0;
  const [test, setTest] = useState(null);

  const toggle = (v) => {
    const next = chosen.includes(v) ? chosen.filter((x) => x !== v) : [...chosen, v];
    const ordered = REMINDER_OPTIONS.map((o) => o.value).filter((x) => next.includes(x));
    onChange(ordered.length ? set(ordered) : unset());
  };

  const sendTest = async () => {
    setTest({ state: 'sending', text: '' });
    try {
      const res = await fetch('/api/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) setTest({ state: 'ok', text: `Test email sent to ${body.to || REMIND_TO}. Check your inbox.` });
      else if (res.status === 404) setTest({ state: 'warn', text: 'Type or pick anything on this shoot first (so it’s saved), then try again.' });
      else setTest({ state: 'warn', text: body.reason ? `It didn’t send: ${body.reason}` : 'It didn’t send. Please try again in a minute.' });
    } catch {
      setTest({ state: 'warn', text: 'It didn’t send. Check your connection and try again.' });
    }
  };

  const next = plan.find((p) => p.state === 'waiting' || p.state === 'due');
  // the morning run has gone by the time you're reading this, so anything due today goes tomorrow
  const nextSend = !next
    ? ''
    : next.due < today || (next.due === today && new Date().getHours() > reminderHour(today))
      ? 'tomorrow morning'
      : next.due === today
        ? 'this morning'
        : shortDay(next.due);
  return (
    <div className="lo-rem">
      <div className="lo-rem-chips">
        {REMINDER_OPTIONS.map((o, i) => {
          const on = chosen.includes(o.value);
          const items = plan.filter((p) => p.option === o.value);
          const allSent = items.length > 0 && items.every((p) => p.state === 'sent');
          const allMissed = items.length > 0 && items.every((p) => p.state === 'missed');
          const upcoming = items.find((p) => p.state === 'waiting' || p.state === 'due');
          const days = reminderDays(doc);
          const when = upcoming ? shortDay(upcoming.due) : days.length ? shortDay(addDays(days[0], -o.days)) : '';
          let sub = when;
          if (!hasDate) sub = 'Add a date first';
          else if (on && allSent) sub = 'Sent';
          else if (on && allMissed) sub = 'Too late for this one';
          return (
            <button
              key={o.value}
              type="button"
              className="lo-rem-chip"
              data-on={on ? '' : undefined}
              data-state={on ? (allSent ? 'sent' : allMissed ? 'missed' : 'waiting') : undefined}
              aria-pressed={on}
              disabled={readOnly}
              onClick={() => toggle(o.value)}
              style={{ '--i': i }}
            >
              <span className="lo-li-box">
                <IconTick />
              </span>
              <span className="lo-rem-text">
                <b>{o.title}</b>
                <small>{sub}</small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="lo-rem-foot">
        <span className="lo-rem-ic" aria-hidden="true">
          <MailIcon />
        </span>
        <span className="lo-rem-say">
          {!hasDate ? (
            <>Add the shoot day and your reminders will be worked out from it.</>
          ) : next ? (
            <>
              Next email <b>{nextSend}</b> at around {reminderHour(next.due < today ? today : next.due)}am, to <b>{REMIND_TO}</b>
            </>
          ) : chosen.length ? (
            <>No more reminders to send for this shoot.</>
          ) : (
            <>No reminders picked. Tick when you’d like an email.</>
          )}
        </span>
        <button type="button" className="lo-mini-btn" onClick={sendTest} disabled={!id || (test && test.state === 'sending')}>
          {test && test.state === 'sending' ? 'Sending…' : 'Send a test now'}
        </button>
      </div>
      {test && test.text ? (
        <p className="lo-rem-note" data-tone={test.state}>
          {test.text}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- the Save button at the bottom ---------- */

/** a field with no heading, just its own card */
export const BareField = (props) => props.children;

export function SaveShootInput(props) {
  const { value, onChange, readOnly } = props;
  const doc = useFormValue([]) || {};
  const toast = useToast();
  const b = computeBudget(doc);
  const days = shootDays(doc);
  const locs = (Array.isArray(doc.locations) ? doc.locations : []).filter((l) => l && (l.name || l.address));
  const kit = (Array.isArray(doc.kit) ? doc.kit : []).filter((k) => k && k._ref);
  const notes = (Array.isArray(doc.notes) ? doc.notes : []).filter((n) => n && typeof n.text === 'string' && n.text.trim());
  const message = Boolean(doc.client && typeof doc.client.message === 'string' && doc.client.message.trim());
  const checks = [
    { label: 'Date', ok: days.length > 0, text: days.length ? `${shortDay(days[0])}${days.length > 1 ? ` + ${days.length - 1} more` : ''}` : 'Not set yet' },
    { label: 'Client', ok: Boolean(clientLine(doc)), text: clientLine(doc) || 'Not added' },
    { label: 'Location', ok: locs.length > 0, text: locs.length ? locs[0].name || locs[0].address : 'Not added' },
    { label: 'Price', ok: b.income > 0, text: b.income > 0 ? money(b.income) : 'Not added' },
    { label: 'Equipment', ok: kit.length > 0, text: kit.length ? `${kit.length} item${kit.length === 1 ? '' : 's'} to pack` : 'Nothing picked yet' },
    {
      label: 'Client notes',
      ok: notes.length > 0 || Boolean(message),
      text: notes.length ? `${notes.length} note${notes.length === 1 ? '' : 's'}${message ? ' + their message' : ''}` : message ? 'Their enquiry message' : 'None yet',
    },
  ];

  const client = useClient({ apiVersion: '2024-10-01' });
  const mode = useContext(ShootMode);
  const save = () => {
    if (readOnly) return;
    onChange(set(new Date().toISOString()));
    if (doc.client && doc.client.enquiry && doc.client.enquiry._ref) tickEnquiry(client, doc.client.enquiry._ref);
    toast.push({ status: 'success', title: 'Shoot saved', description: 'It’s booked in your calendar.' });
  };

  if (value) {
    const at = new Date(value);
    return (
      <div className="lo-save" data-booked="">
        <span className="lo-save-tick" aria-hidden="true">
          <IconTick />
        </span>
        <span className="lo-save-main">
          <b>Shoot saved</b>
          <span>
            Booked on {at.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} at {at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.
            Anything you change from now on saves as you type.
          </span>
        </span>
        {!readOnly ? (
          <span className="lo-save-acts">
            <button type="button" className="lo-mini-btn" data-quiet="" onClick={() => onChange(unset())}>
              Undo
            </button>
            {mode && mode.done ? (
              <button type="button" className="lo-mini-btn" data-primary="" onClick={mode.done}>
                Done editing
              </button>
            ) : null}
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <div className="lo-save">
      <span className="lo-save-head">
        <b>Ready to save this shoot?</b>
        <span>Check the essentials. Anything missing can be added later.</span>
      </span>
      <ul className="lo-save-checks">
        {checks.map((c, i) => (
          <li key={c.label} data-ok={c.ok ? '' : undefined} style={{ '--i': i }}>
            <span className="lo-save-dot" aria-hidden="true">
              {c.ok ? <IconTick /> : null}
            </span>
            <span className="lo-save-what">
              <small>{c.label}</small>
              <span className="lo-save-val">{c.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="lo-save-btn" onClick={save} disabled={readOnly}>
        Save shoot
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </button>
    </div>
  );
}
