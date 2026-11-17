/* Clients: everyone who has booked a shoot with you, grouped so each company (or person) appears once.
   Plain functions, no Sanity imports, so they can be tested on their own.

   How things are grouped: two bookings, enquiries or saved clients belong together when their details
   match: the same company name (ignoring "Ltd", "The", capitals and so on), the same email address, the
   same phone number, the same business email domain (anything@peakgym.uk), or a shoot booked from that
   enquiry. Someone who has only sent an enquiry isn't a client yet; their enquiries show up under them
   once they book. Within a client, the same person (same email or same full name) is one person, with
   every phone number and email address they've used. */

import { isBooked, shootDays, todayYmd } from './bookingData';

export const CLIENT_CATEGORIES = [
  { title: 'Brand', value: 'brand' },
  { title: 'Agency', value: 'agency' },
  { title: 'Food and drink', value: 'food' },
  { title: 'Retail', value: 'retail' },
  { title: 'Fitness and health', value: 'fitness' },
  { title: 'Beauty', value: 'beauty' },
  { title: 'Automotive', value: 'automotive' },
  { title: 'Property', value: 'property' },
  { title: 'Events', value: 'events' },
  { title: 'Music and arts', value: 'arts' },
  { title: 'Personal', value: 'personal' },
  { title: 'Other', value: 'other' },
];
export const categoryTitle = (v) => (CLIENT_CATEGORIES.find((c) => c.value === v) || {}).title || '';

export const CLIENT_SORTS = [
  { value: 'recent', title: 'Latest activity' },
  { value: 'az', title: 'Alphabetical, A to Z' },
  { value: 'za', title: 'Alphabetical, Z to A' },
  { value: 'company', title: 'Companies first' },
  { value: 'contact', title: 'Contact name' },
  { value: 'newest', title: 'Date added, newest' },
  { value: 'oldest', title: 'Date added, oldest' },
  { value: 'shoots', title: 'Most shoots' },
  { value: 'earned', title: 'Most earned' },
  { value: 'next', title: 'Next shoot soonest' },
];

/* ---------- telling whether details match ---------- */

const FREE_MAIL = new Set([
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'outlook.co.uk', 'live.com', 'live.co.uk', 'msn.com',
  'yahoo.com', 'yahoo.co.uk', 'ymail.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'aol.co.uk', 'protonmail.com', 'proton.me',
  'btinternet.com', 'sky.com', 'virginmedia.com', 'talktalk.net', 'gmx.com', 'gmx.co.uk', 'mail.com', 'zoho.com', 'hey.com',
]);
const NOISE = new Set(['ltd', 'limited', 'plc', 'llp', 'inc', 'incorporated', 'co', 'company', 'group', 'the', 'and', 'uk']);

const plain = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '');

/** "The Peak Gym Ltd." and "peak gym" are the same company */
export function orgKey(name) {
  const words = plain(name).replace(/&/g, ' and ').split(/[^a-z0-9]+/).filter(Boolean);
  const kept = words.filter((w) => !NOISE.has(w));
  return (kept.length ? kept : words).join(' ');
}
/** "Sam O’Neil" and "sam oneil" are the same name */
export const nameKey = (name) => plain(name).replace(/[^a-z]+/g, ' ').trim();
export function emailKey(email) {
  const e = String(email || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : '';
}
/** the company's own email domain (not Gmail and the like) */
export function bizDomain(email) {
  const e = emailKey(email);
  const d = e ? e.split('@')[1] : '';
  return d && !FREE_MAIL.has(d) ? d : '';
}
export function siteDomain(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  try {
    return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}
/** "+44 (0)7700 900123", "07700900123" and "0044 7700 900 123" are the same number */
export function phoneKey(phone) {
  let d = String(phone || '').replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
  if (d.startsWith('+44')) d = `0${d.slice(3)}`;
  else if (d.startsWith('0044')) d = `0${d.slice(4)}`;
  else if (d.startsWith('44') && d.length === 12) d = `0${d.slice(2)}`;
  d = d.replace(/\D/g, '');
  return d.length >= 9 ? d : '';
}
/** the same, but keeps short or odd numbers too (for listing, not for matching) */
const phoneId = (t) => phoneKey(t) || String(t || '').replace(/\D/g, '');

const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v) => (typeof v === 'string' ? v.trim() : '');
const dayOf = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '');
const minOf = (list) => list.filter(Boolean).sort()[0] || '';
const maxOf = (list) => list.filter(Boolean).sort().slice(-1)[0] || '';

/* ---------- the grouping ---------- */

function keysFor(contact) {
  const c = contact || {};
  const org = orgKey(c.company);
  return [org ? `org:${org}` : '', emailKey(c.email) ? `mail:${emailKey(c.email)}` : '', phoneKey(c.phone) ? `tel:${phoneKey(c.phone)}` : '', bizDomain(c.email) ? `dom:${bizDomain(c.email)}` : ''].filter(Boolean);
}

/** a booking's sums, whichever shape it comes in */
const incomeOf = (b) => (b && b.money && typeof b.money.income === 'number' ? b.money.income : 0);
const paidOf = (b) => (b && b.money && typeof b.money.paid === 'number' ? b.money.paid : 0);
const owedOf = (b) => (b && b.money && typeof b.money.outstanding === 'number' ? b.money.outstanding : 0);
const daysOf = (b) => (b && Array.isArray(b.days) && b.days.length ? b.days : shootDays(b || {}));

/**
 * Every client, with their people, shoots, enquiries and portfolio work.
 * saved: client documents · bookings: booked shoots (with .money from computeBudget) · enquiries · work: portfolio shoots.
 * Each list should already be one entry per document (drafts merged, with _baseId).
 */
export function buildClients({ saved = [], bookings = [], enquiries = [], work = [] } = {}, today = todayYmd()) {
  const nodes = [];
  arr(saved).forEach((c) => {
    if (!c) return;
    const strong = [];
    if (c.kind !== 'person' && orgKey(c.name)) strong.push(`org:${orgKey(c.name)}`);
    arr(c.aliases).forEach((a) => orgKey(a) && strong.push(`org:${orgKey(a)}`));
    arr(c.people).forEach((p) => {
      arr(p && p.emails).forEach((e) => {
        if (emailKey(e)) strong.push(`mail:${emailKey(e)}`);
        if (bizDomain(e)) strong.push(`dom:${bizDomain(e)}`);
      });
      arr(p && p.phones).forEach((t) => phoneKey(t) && strong.push(`tel:${phoneKey(t)}`));
    });
    if (siteDomain(c.website)) strong.push(`dom:${siteDomain(c.website)}`);
    nodes.push({ type: 'client', doc: c, strong, links: [], name: c.kind === 'person' ? nameKey(c.name) : '' });
  });
  arr(bookings).forEach((b) => {
    const k = (b && b.client) || {};
    const strong = keysFor(k);
    const links = k.enquiry ? [`enq:${String(k.enquiry).replace(/^drafts\./, '')}`] : [];
    if (!strong.length && !links.length && !nameKey(k.name)) return; // no client details on it yet
    nodes.push({ type: 'booking', doc: b, strong, links, name: nameKey(k.name) });
  });
  arr(enquiries).forEach((e) => {
    if (!e) return;
    nodes.push({ type: 'enquiry', doc: e, strong: keysFor(e), links: [`enq:${e._baseId || e._id}`], name: nameKey(e.name) });
  });

  /* join everything that shares a detail */
  const parent = nodes.map((_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const join = (a, b) => {
    const x = find(a);
    const y = find(b);
    if (x !== y) parent[Math.max(x, y)] = Math.min(x, y);
  };
  const owner = new Map();
  nodes.forEach((n, i) => {
    [...n.strong, ...n.links].forEach((key) => {
      if (owner.has(key)) join(owner.get(key), i);
      else owner.set(key, i);
    });
  });
  /* someone with nothing but a name joins the one group where that name already appears, if there's exactly one */
  nodes.forEach((n, i) => {
    if (n.strong.length || !n.name) return;
    const roots = new Set();
    nodes.forEach((m, j) => {
      if (j !== i && m.name === n.name && (m.strong.length || m.type === 'client')) roots.add(find(j));
    });
    if (roots.size === 1) join(i, [...roots][0]);
  });

  const groups = new Map();
  nodes.forEach((n, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(n);
  });

  const out = [];
  groups.forEach((members) => {
    const savedDocs = members.filter((n) => n.type === 'client').map((n) => n.doc).sort((a, b) => String(a._createdAt || '').localeCompare(String(b._createdAt || '')));
    const shoots = members.filter((n) => n.type === 'booking').map((n) => n.doc);
    // only someone who has booked a shoot (or you've added yourself) is a client
    if (!savedDocs.length && !shoots.some(isBooked)) return;
    out.push(describe(savedDocs, shoots, members.filter((n) => n.type === 'enquiry').map((n) => n.doc), work, today));
  });
  return out;
}

/* ---------- one client, put together ---------- */

function describe(savedDocs, shoots, enquiries, work, today) {
  const savedDoc = savedDocs[0] || null;

  /* the company names it goes by: bookings count most, then enquiries. Each name is written the
     way it's most often written ("Peak Gym" over a one-off "PEAK GYM LTD") */
  const tally = new Map();
  const vote = (name, weight, when) => {
    const n = clean(name).replace(/\s+/g, ' ');
    const k = orgKey(n);
    if (!k) return;
    const t = tally.get(k) || { weight: 0, when: '', spellings: new Map() };
    t.weight += weight;
    if (String(when || '') > t.when) t.when = String(when || '');
    const sp = t.spellings.get(n) || { name: n, weight: 0, when: '' };
    sp.weight += weight;
    if (String(when || '') > sp.when) sp.when = String(when || '');
    t.spellings.set(n, sp);
    tally.set(k, t);
  };
  shoots.forEach((b) => vote(b.client && b.client.company, 3, b.date || b.bookedAt));
  enquiries.forEach((e) => vote(e.company, 1, e.receivedAt));
  const shouty = (n) => n === n.toUpperCase() && /[A-Z]{3}/.test(n);
  const ranked = [...tally.values()]
    .sort((a, b) => b.weight - a.weight || b.when.localeCompare(a.when))
    .map((t) => {
      const best = [...t.spellings.values()].sort((a, b) => b.weight - a.weight || Number(shouty(a.name)) - Number(shouty(b.name)) || b.when.localeCompare(a.when))[0];
      return { name: best.name, weight: t.weight, when: t.when };
    });

  const people = mergePeople(savedDoc, savedDocs, shoots, enquiries);
  const kind = savedDoc ? savedDoc.kind || 'company' : ranked.length ? 'company' : 'person';
  const name = clean(savedDoc && savedDoc.name) || (kind === 'company' && ranked[0] ? ranked[0].name : '') || (people[0] && people[0].name) || 'Client';
  const own = orgKey(name);
  const otherNames = [];
  [...ranked.map((r) => r.name), ...arr(savedDoc && savedDoc.aliases)].forEach((n) => {
    const k = orgKey(n);
    if (k && k !== own && !otherNames.some((o) => orgKey(o) === k)) otherNames.push(clean(n));
  });

  /* their portfolio work: shoots on your Work page under any of their names */
  const names = new Set([own, ...otherNames.map(orgKey), ...arr(savedDoc && savedDoc.aliases).map(orgKey)].filter(Boolean));
  if (kind === 'person') people.forEach((p) => p.name && names.add(orgKey(p.name)));
  const portfolio = arr(work)
    .filter((w) => w && names.has(orgKey(w.title)))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  /* their shoots, newest first; numbers count saved shoots that weren't cancelled */
  const list = shoots
    .map((b) => {
      const days = daysOf(b);
      return { ...b, first: days[0] || dayOf(b.date), last: days[days.length - 1] || dayOf(b.date) };
    })
    .sort((a, b) => String(b.first || '').localeCompare(String(a.first || '')));
  const real = list.filter((b) => isBooked(b) && b.status !== 'cancelled');
  const past = real.filter((b) => b.last && b.last < today);
  const ahead = real.filter((b) => b.first && b.last >= today).sort((a, b) => a.first.localeCompare(b.first));
  const round = (n) => Math.round(n * 100) / 100;
  const earned = round(real.reduce((t, b) => t + incomeOf(b), 0));
  const paid = round(real.reduce((t, b) => t + paidOf(b), 0));
  const owed = round(real.reduce((t, b) => t + owedOf(b), 0));

  // the shoot that first made them a client: it keeps them the same entry as more shoots come in
  const anchor = [...shoots].sort((a, b) => String(a._createdAt || a._id).localeCompare(String(b._createdAt || b._id)))[0];
  const enq = [...enquiries].sort((a, b) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || '')));
  const addedAt =
    dayOf(savedDoc && savedDoc.addedAt) ||
    minOf([...list.filter(isBooked).map((b) => dayOf(b.bookedAt) || dayOf(b._createdAt)), dayOf(savedDoc && savedDoc._createdAt)]) ||
    today;
  const activity = maxOf([...list.map((b) => b.last), ...list.map((b) => dayOf(b.bookedAt)), ...enq.map((e) => dayOf(e.receivedAt)), dayOf(savedDoc && savedDoc._updatedAt), addedAt]);

  const search = [name, ...otherNames, savedDoc && savedDoc.notes, categoryTitle(savedDoc && savedDoc.category), ...people.flatMap((p) => [p.name, ...p.roles, ...p.emails, ...p.phones, ...p.phones.map(phoneId)])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return {
    key: savedDoc ? savedDoc._baseId || savedDoc._id : `auto-${anchor ? anchor._baseId || anchor._id : nameKey(name)}`,
    saved: savedDoc,
    alsoSaved: savedDocs.slice(1),
    kind,
    name,
    otherNames,
    category: (savedDoc && savedDoc.category) || '',
    website: (savedDoc && savedDoc.website) || '',
    notes: (savedDoc && savedDoc.notes) || '',
    people,
    shoots: list,
    enquiries: enq,
    work: portfolio,
    addedAt,
    activity,
    lastShoot: past.length ? maxOf(past.map((b) => b.last)) : '',
    nextShoot: ahead[0] || null,
    stats: { shoots: real.length, done: past.length, upcoming: ahead.length, cancelled: list.filter((b) => b.status === 'cancelled').length, earned, paid, owed, enquiries: enq.length },
    search,
  };
}

/** the same person (same email, or the same full name) once, with every number and address they've used */
function mergePeople(savedDoc, savedDocs, shoots, enquiries) {
  const found = [];
  savedDocs.forEach((c) =>
    arr(c.people).forEach((p) => found.push({ name: clean(p && p.name), role: clean(p && p.role), emails: arr(p && p.emails), phones: arr(p && p.phones), when: '', from: 'client' }))
  );
  if (savedDoc && savedDoc.kind === 'person' && !arr(savedDoc.people).length) found.push({ name: clean(savedDoc.name), role: '', emails: [], phones: [], when: '', from: 'client' });
  shoots.forEach((b) => {
    const k = b.client || {};
    if (clean(k.name) || k.email || k.phone) found.push({ name: clean(k.name), role: '', emails: [k.email], phones: [k.phone], when: dayOf(b.date) || dayOf(b.bookedAt), from: 'shoot' });
  });
  enquiries.forEach((e) => {
    if (clean(e.name) || e.email || e.phone) found.push({ name: clean(e.name), role: '', emails: [e.email], phones: [e.phone], when: dayOf(e.receivedAt), from: 'enquiry' });
  });

  const people = [];
  const byKey = new Map();
  const blank = () => ({ name: '', roles: [], emails: [], phones: [], shoots: 0, enquiries: 0, last: '' });
  const better = (a, b) => (b && (!a || b.split(/\s+/).length > a.split(/\s+/).length) ? b : a);
  const addPhone = (into, t) => {
    const k = phoneId(t);
    if (k && !into.phones.some((x) => phoneId(x) === k)) into.phones.push(clean(t));
  };
  const addEmail = (into, e) => {
    const k = emailKey(e);
    if (k && !into.emails.includes(k)) into.emails.push(k);
  };
  const keysOf = (p) => [...p.emails.map(emailKey).filter(Boolean).map((e) => `mail:${e}`), nameKey(p.name).includes(' ') ? `name:${nameKey(p.name)}` : ''].filter(Boolean);
  found.forEach((p) => {
    const hits = [...new Set(keysOf(p).map((k) => byKey.get(k)).filter(Boolean))];
    const into = hits[0] || blank();
    if (!hits.length) people.push(into);
    // this detail links two people we had apart, so they're the same person
    hits.slice(1).forEach((other) => {
      into.name = better(into.name, other.name);
      other.roles.forEach((r) => !into.roles.includes(r) && into.roles.push(r));
      other.emails.forEach((e) => addEmail(into, e));
      other.phones.forEach((t) => addPhone(into, t));
      into.shoots += other.shoots;
      into.enquiries += other.enquiries;
      if (other.last > into.last) into.last = other.last;
      people.splice(people.indexOf(other), 1);
      byKey.forEach((v, k) => v === other && byKey.set(k, into));
    });
    into.name = better(into.name, p.name);
    if (p.role && !into.roles.includes(p.role)) into.roles.push(p.role);
    p.emails.forEach((e) => addEmail(into, e));
    p.phones.forEach((t) => addPhone(into, t));
    if (p.from === 'shoot') into.shoots += 1;
    if (p.from === 'enquiry') into.enquiries += 1;
    if (p.when > into.last) into.last = p.when;
    keysOf(into).forEach((k) => byKey.set(k, into));
  });
  return people
    .filter((p) => p.name || p.emails.length || p.phones.length)
    .sort((a, b) => b.shoots - a.shoots || String(b.last).localeCompare(String(a.last)) || a.name.localeCompare(b.name));
}

/* ---------- finding and ordering ---------- */

export function filterClients(list, { show = 'all', category = '', q = '' } = {}) {
  const words = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
  return arr(list).filter((c) => {
    if (show === 'company' && c.kind !== 'company') return false;
    if (show === 'person' && c.kind !== 'person') return false;
    if (show === 'upcoming' && !c.nextShoot) return false;
    if (show === 'owed' && !(c.stats.owed > 0)) return false;
    if (category === 'none' && c.category) return false;
    if (category && category !== 'none' && c.category !== category) return false;
    return words.every((w) => c.search.includes(w));
  });
}

const contactOf = (c) => (c.kind === 'person' ? c.name : (c.people[0] && c.people[0].name) || '');
const az = (a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' });

export function sortClients(list, by = 'recent') {
  const l = [...arr(list)];
  switch (by) {
    case 'az':
      return l.sort(az);
    case 'za':
      return l.sort((a, b) => az(b, a));
    case 'company':
      return l.sort((a, b) => (a.kind === b.kind ? az(a, b) : a.kind === 'company' ? -1 : 1));
    case 'contact':
      return l.sort((a, b) => {
        const x = contactOf(a);
        const y = contactOf(b);
        if (!x !== !y) return x ? -1 : 1;
        return x.localeCompare(y, 'en-GB', { sensitivity: 'base' }) || az(a, b);
      });
    case 'newest':
      return l.sort((a, b) => b.addedAt.localeCompare(a.addedAt) || az(a, b));
    case 'oldest':
      return l.sort((a, b) => a.addedAt.localeCompare(b.addedAt) || az(a, b));
    case 'shoots':
      return l.sort((a, b) => b.stats.shoots - a.stats.shoots || b.stats.earned - a.stats.earned || az(a, b));
    case 'earned':
      return l.sort((a, b) => b.stats.earned - a.stats.earned || b.stats.shoots - a.stats.shoots || az(a, b));
    case 'next':
      return l.sort((a, b) => {
        if (!a.nextShoot !== !b.nextShoot) return a.nextShoot ? -1 : 1;
        if (!a.nextShoot) return b.activity.localeCompare(a.activity) || az(a, b);
        return a.nextShoot.first.localeCompare(b.nextShoot.first) || az(a, b);
      });
    default:
      return l.sort((a, b) => b.activity.localeCompare(a.activity) || az(a, b));
  }
}

/** booked shoots with no client details at all yet, so they can't be put under anyone */
export const unattached = (bookings) =>
  arr(bookings).filter((b) => {
    const k = (b && b.client) || {};
    return isBooked(b) && !keysFor(k).length && !k.enquiry && !nameKey(k.name);
  });
