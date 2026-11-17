/* Clients: the companies you shoot for, and the people there (your clients).
   Plain functions, no Sanity imports, so they can be tested on their own.

   You work with businesses, so the Clients page lists companies; the people who work at each one
   are inside it. A company appears once it has booked a shoot with you, or once you've saved it.
   Someone who has only sent an enquiry isn't a client yet; their enquiry shows up under the company
   once it books.

   How things are grouped: bookings, enquiries, saved companies and saved clients belong to the same
   company when their details match: the same company name (ignoring "Ltd", "The", capitals and so
   on), the same business email domain (anything@otellos.com), a client saved under that company, a
   shoot booked from that enquiry, or the same email address or phone number (as long as that doesn't
   join two different businesses). Inside a company, the same person (same email or same full name)
   is one person, with every phone number and email address they've used. */

import { isBooked, shootDays, todayYmd } from './bookingData';

export const CLIENT_CATEGORIES = [
  { title: 'Food and drink', value: 'food' },
  { title: 'Retail', value: 'retail' },
  { title: 'Brand', value: 'brand' },
  { title: 'Agency', value: 'agency' },
  { title: 'Beauty', value: 'beauty' },
  { title: 'Fitness and health', value: 'fitness' },
  { title: 'Automotive', value: 'automotive' },
  { title: 'Property', value: 'property' },
  { title: 'Events', value: 'events' },
  { title: 'Music and arts', value: 'arts' },
  { title: 'Other', value: 'other' },
];
export const categoryTitle = (v) => (CLIENT_CATEGORIES.find((c) => c.value === v) || {}).title || '';

export const CLIENT_SORTS = [
  { value: 'recent', title: 'Latest activity' },
  { value: 'az', title: 'Alphabetical, A to Z' },
  { value: 'za', title: 'Alphabetical, Z to A' },
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

/** "The Otellos Ltd." and "otellos" are the same company */
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
const baseId = (id) => String(id || '').replace(/^drafts\./, '');
const idOf = (d) => (d ? d._baseId || baseId(d._id) : '');

/* ---------- saved records ---------- */

/**
 * The saved companies and clients, from the documents as they come. Nothing counts until it's saved
 * (the Save button sets savedAt). Records from the first version of clients still count: one that was
 * a whole company becomes a company (with its people as contacts), one that was a person a client.
 */
export function savedRecords(companyDocs = [], clientDocs = []) {
  const companies = arr(companyDocs)
    .filter((c) => c && c.savedAt && clean(c.name))
    .map((c) => ({ ...c, _baseId: idOf(c) }));
  const people = [];
  arr(clientDocs).forEach((d) => {
    if (!d) return;
    const legacy = d.kind === 'company' || d.kind === 'person';
    if (d.kind === 'company') {
      if (clean(d.name)) companies.push({ ...d, _baseId: idOf(d), legacy: true, savedAt: d.savedAt || d.addedAt || d._createdAt, contacts: arr(d.people) });
      return;
    }
    if (!(d.savedAt || legacy) || !clean(d.name)) return;
    // an older record kept a person's details in a list
    const contacts = legacy ? arr(d.people) : [];
    people.push({
      ...d,
      _baseId: idOf(d),
      company: d.company ? baseId(d.company._ref || d.company) : '',
      role: d.role || (contacts[0] && contacts[0].role) || '',
      emails: [...arr(d.emails), ...contacts.flatMap((p) => arr(p && p.emails))],
      phones: [...arr(d.phones), ...contacts.flatMap((p) => arr(p && p.phones))],
      savedAt: d.savedAt || d.addedAt || d._createdAt,
    });
  });
  return { companies, people };
}

/* ---------- the grouping ---------- */

function contactKeys(c) {
  const k = c || {};
  return [
    emailKey(k.email) ? `mail:${emailKey(k.email)}` : '',
    phoneKey(k.phone) ? `tel:${phoneKey(k.phone)}` : '',
    bizDomain(k.email) ? `dom:${bizDomain(k.email)}` : '',
  ].filter(Boolean);
}
const orgKeyed = (name) => (orgKey(name) ? `org:${orgKey(name)}` : '');

/** a booking's sums, whichever shape it comes in */
const incomeOf = (b) => (b && b.money && typeof b.money.income === 'number' ? b.money.income : 0);
const paidOf = (b) => (b && b.money && typeof b.money.paid === 'number' ? b.money.paid : 0);
const owedOf = (b) => (b && b.money && typeof b.money.outstanding === 'number' ? b.money.outstanding : 0);
const daysOf = (b) => (b && Array.isArray(b.days) && b.days.length ? b.days : shootDays(b || {}));

/**
 * Your companies, each with its people, shoots, enquiries and portfolio work; plus anyone with no
 * company at all (`loners`), so they're never lost.
 * companies / people: saved records (see savedRecords) · bookings: with .money from computeBudget ·
 * enquiries · work: portfolio shoots. Lists should be one entry per document (drafts merged, with _baseId).
 */
export function buildClients({ companies = [], people = [], bookings = [], enquiries = [], work = [] } = {}, today = todayYmd()) {
  const nodes = [];
  arr(companies).forEach((c) => {
    const keys = [orgKeyed(c.name), ...arr(c.aliases).map(orgKeyed), siteDomain(c.website) ? `dom:${siteDomain(c.website)}` : '', ...contactKeys({ email: c.email, phone: c.phone })];
    arr(c.contacts).forEach((p) => {
      arr(p && p.emails).forEach((e) => keys.push(...contactKeys({ email: e })));
      arr(p && p.phones).forEach((t) => keys.push(...contactKeys({ phone: t })));
    });
    nodes.push({ type: 'company', doc: c, keys: keys.filter(Boolean), links: [`co:${idOf(c)}`], org: orgKey(c.name), name: '', companyId: idOf(c) });
  });
  arr(people).forEach((p) => {
    const keys = [];
    arr(p.emails).forEach((e) => keys.push(...contactKeys({ email: e })));
    arr(p.phones).forEach((t) => keys.push(...contactKeys({ phone: t })));
    nodes.push({ type: 'person', doc: p, keys, links: p.company ? [`co:${p.company}`] : [], org: '', name: nameKey(p.name), names: [p.name, ...arr(p.aliases)].map(nameKey).filter(Boolean) });
  });
  arr(bookings).forEach((b) => {
    const k = (b && b.client) || {};
    const keys = [orgKeyed(k.company), ...contactKeys(k)].filter(Boolean);
    const links = k.enquiry ? [`enq:${baseId(k.enquiry)}`] : [];
    if (!keys.length && !links.length && !nameKey(k.name)) return; // no client details on it yet
    nodes.push({ type: 'booking', doc: b, keys, links, org: orgKey(k.company), name: nameKey(k.name) });
  });
  arr(enquiries).forEach((e) => {
    if (!e) return;
    nodes.push({ type: 'enquiry', doc: e, keys: [orgKeyed(e.company), ...contactKeys(e)].filter(Boolean), links: [`enq:${idOf(e)}`], org: orgKey(e.company), name: nameKey(e.name) });
  });

  /* join everything that shares a detail, without letting one person's email or number join two different businesses */
  const parent = nodes.map((_, i) => i);
  const orgs = nodes.map((n) => new Set(n.org ? [n.org] : []));
  const docs = nodes.map((n) => new Set(n.companyId ? [n.companyId] : []));
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const meets = (a, b) => [...a].some((x) => b.has(x));
  const join = (a, b, how) => {
    const x = find(a);
    const y = find(b);
    if (x === y) return;
    const twoBusinesses = (docs[x].size && docs[y].size && !meets(docs[x], docs[y])) || (orgs[x].size && orgs[y].size && !meets(orgs[x], orgs[y]));
    if (twoBusinesses && (how === 'mail' || how === 'tel')) return;
    if (docs[x].size && docs[y].size && !meets(docs[x], docs[y]) && how !== 'org') return;
    const [keep, drop] = x < y ? [x, y] : [y, x];
    parent[drop] = keep;
    orgs[drop].forEach((o) => orgs[keep].add(o));
    docs[drop].forEach((d) => docs[keep].add(d));
  };
  const owner = new Map();
  nodes.forEach((n, i) => {
    // a client's own company comes first, so it wins over anything their email might suggest
    [...n.links, ...n.keys].forEach((key) => {
      if (owner.has(key)) join(owner.get(key), i, key.split(':')[0]);
      else owner.set(key, i);
    });
  });
  const namesOf = (n) => n.names || (n.name ? [n.name] : []);
  /* someone with nothing but a name joins the one group where that name already appears, if there's exactly one */
  nodes.forEach((n, i) => {
    if (n.keys.length || n.links.length || !n.name) return;
    const roots = new Set();
    nodes.forEach((m, j) => {
      if (j !== i && namesOf(m).includes(n.name)) roots.add(find(j));
    });
    if (roots.size === 1) join(i, [...roots][0], 'name');
  });
  /* the same full name is the same person: someone not at any business yet joins the one group where
     their full name already appears (at a company, or another booking of theirs) */
  const business = (r) => orgs[r].size > 0 || docs[r].size > 0;
  nodes.forEach((n, i) => {
    namesOf(n).forEach((name) => {
      if (!name.includes(' ') || business(find(i))) return;
      const roots = new Set();
      nodes.forEach((m, j) => {
        if (find(j) !== find(i) && namesOf(m).includes(name)) roots.add(find(j));
      });
      if (roots.size === 1) join(i, [...roots][0], 'name');
    });
  });

  const groups = new Map();
  nodes.forEach((n, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(n);
  });

  const out = [];
  const loners = [];
  groups.forEach((members) => {
    const of = (t) => members.filter((n) => n.type === t).map((n) => n.doc);
    const companyDocs = of('company').sort((a, b) => String(a._createdAt || '').localeCompare(String(b._createdAt || '')));
    const personDocs = of('person');
    const shoots = of('booking');
    const enq = of('enquiry');
    const named = members.some((n) => n.org);
    const booked = shoots.some(isBooked);
    if (!companyDocs.length && !personDocs.length && !booked) return; // only enquiries: not a client yet
    const c = describe(companyDocs, personDocs, shoots, enq, work, today);
    // a business that has booked a shoot, or that you've saved yourself, is listed; anyone else is a client with no company
    if (companyDocs.length || (named && booked)) out.push(c);
    else loners.push(...c.people.filter((p) => p.saved || p.shoots.some(isBooked)).map((p) => ({ ...p, company: null })));
  });
  return { companies: out, loners };
}

/* ---------- one company, put together ---------- */

function describe(companyDocs, personDocs, shoots, enquiries, work, today) {
  const savedDoc = companyDocs[0] || null;

  /* the names it goes by: bookings count most, then enquiries. Each name is written the way it's most
     often written ("Otellos" over a one-off "OTELLOS LTD") */
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
    .map((t) => [...t.spellings.values()].sort((a, b) => b.weight - a.weight || Number(shouty(a.name)) - Number(shouty(b.name)) || b.when.localeCompare(a.when))[0].name);

  const people = mergePeople(savedDoc, personDocs, shoots, enquiries, today);
  const name = clean(savedDoc && savedDoc.name) || ranked[0] || (people[0] && people[0].name) || 'Company';
  const own = orgKey(name);
  const otherNames = [];
  [...ranked, ...arr(savedDoc && savedDoc.aliases)].forEach((n) => {
    const k = orgKey(n);
    if (k && k !== own && !otherNames.some((o) => orgKey(o) === k)) otherNames.push(clean(n));
  });

  /* their portfolio work: shoots on your Work page under any of their names */
  const names = new Set([own, ...otherNames.map(orgKey)].filter(Boolean));
  const portfolio = arr(work)
    .filter((w) => w && names.has(orgKey(w.title)))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const list = withDays(shoots);
  const sums = shootSums(list, today);
  const enq = [...enquiries].sort((a, b) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || '')));
  const addedAt =
    dayOf(savedDoc && savedDoc.addedAt) ||
    minOf([...list.filter(isBooked).map((b) => dayOf(b.bookedAt) || dayOf(b._createdAt)), dayOf(savedDoc && savedDoc.savedAt), ...personDocs.map((p) => dayOf(p.addedAt) || dayOf(p.savedAt))]) ||
    today;
  const activity = maxOf([...list.map((b) => b.last), ...list.map((b) => dayOf(b.bookedAt)), ...enq.map((e) => dayOf(e.receivedAt)), dayOf(savedDoc && savedDoc._updatedAt), addedAt]);
  // the shoot (or record) that first brought them in: it keeps them the same entry as more come in
  const anchor = [...shoots].sort((a, b) => String(a._createdAt || a._id).localeCompare(String(b._createdAt || b._id)))[0];

  const info = savedDoc || {};
  const search = [name, ...otherNames, info.notes, info.email, info.phone, info.website, categoryTitle(info.category), ...people.flatMap((p) => [p.name, ...p.otherNames, ...p.roles, ...p.emails, ...p.phones, ...p.phones.map(phoneId)])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return {
    key: savedDoc ? savedDoc._baseId : `auto-${anchor ? idOf(anchor) : (personDocs[0] && personDocs[0]._baseId) || orgKey(name)}`,
    saved: savedDoc,
    alsoSaved: companyDocs.slice(1),
    name,
    otherNames,
    category: info.category || '',
    website: info.website || '',
    email: info.email || '',
    phone: info.phone || '',
    address: info.address || '',
    notes: info.notes || '',
    people,
    shoots: list,
    enquiries: enq,
    work: portfolio,
    addedAt,
    activity,
    lastShoot: sums.lastShoot,
    nextShoot: sums.nextShoot,
    stats: { ...sums.stats, enquiries: enq.length, people: people.length },
    search,
  };
}

function withDays(shoots) {
  return shoots
    .map((b) => {
      const days = daysOf(b);
      return { ...b, first: days[0] || dayOf(b.date), last: days[days.length - 1] || dayOf(b.date) };
    })
    .sort((a, b) => String(b.first || '').localeCompare(String(a.first || '')));
}

/** shoots counted the same way everywhere: saved, not cancelled */
function shootSums(list, today) {
  const real = list.filter((b) => isBooked(b) && b.status !== 'cancelled');
  const past = real.filter((b) => b.last && b.last < today);
  const ahead = real.filter((b) => b.first && b.last >= today).sort((a, b) => a.first.localeCompare(b.first));
  const round = (n) => Math.round(n * 100) / 100;
  return {
    lastShoot: past.length ? maxOf(past.map((b) => b.last)) : '',
    nextShoot: ahead[0] || null,
    stats: {
      shoots: real.length,
      done: past.length,
      upcoming: ahead.length,
      cancelled: list.filter((b) => b.status === 'cancelled').length,
      earned: round(real.reduce((t, b) => t + incomeOf(b), 0)),
      paid: round(real.reduce((t, b) => t + paidOf(b), 0)),
      owed: round(real.reduce((t, b) => t + owedOf(b), 0)),
    },
  };
}

/* ---------- the people at a company ---------- */

const nameWords = (n) => nameKey(n).split(' ').filter(Boolean);
const isFull = (n) => nameWords(n).length > 1;
/** two names that can't be the same person: both full names, and neither is the other with words left out
    ("Mark Lee" and "Mark A Lee" can be; "Mark Lee" and "Lily Ward" can't) */
function clash(a, b) {
  const x = nameWords(a);
  const y = nameWords(b);
  if (x.length < 2 || y.length < 2) return false;
  const within = (s, t) => s.every((w) => t.includes(w));
  return !within(x, y) && !within(y, x);
}

/**
 * Everyone at a company, each person once. The same email address, the same phone number or the same
 * full name is the same person, and everything that's different (other numbers, other email
 * addresses, other names they've gone by, other roles) is kept with them. One exception: two people
 * with different full names who share a number or an inbox (the shop's landline, hello@) stay apart.
 * Their own shoots and enquiries, and their saved client record if there is one, come with them.
 */
function mergePeople(companyDoc, personDocs, shoots, enquiries, today) {
  const found = [];
  // when: for ordering (a shoot's date). since: when they became a client (the day a shoot was booked). asked: their first enquiry
  personDocs.forEach((d) =>
    found.push({ name: clean(d.name), aliases: arr(d.aliases).map(clean).filter(Boolean), role: clean(d.role), emails: arr(d.emails), phones: arr(d.phones), when: dayOf(d.addedAt), since: dayOf(d.addedAt) || dayOf(d.savedAt), saved: d })
  );
  arr(companyDoc && companyDoc.contacts).forEach((p) => found.push({ name: clean(p && p.name), role: clean(p && p.role), emails: arr(p && p.emails), phones: arr(p && p.phones), when: '' }));
  shoots.forEach((b) => {
    const k = b.client || {};
    if (clean(k.name) || k.email || k.phone) found.push({ name: clean(k.name), role: '', emails: [k.email], phones: [k.phone], when: dayOf(b.date) || dayOf(b.bookedAt), since: isBooked(b) ? dayOf(b.bookedAt) || dayOf(b._createdAt) : '', booking: b });
  });
  enquiries.forEach((e) => {
    if (clean(e.name) || e.email || e.phone) found.push({ name: clean(e.name), role: '', emails: [e.email], phones: [e.phone], when: dayOf(e.receivedAt), asked: dayOf(e.receivedAt), enquiry: e });
  });

  const people = [];
  const byKey = new Map(); // a detail → the people who have it
  const blank = () => ({ saved: null, alsoSaved: [], names: [], nicks: [], roles: [], emails: [], phones: [], shoots: [], enquiries: [], first: '', last: '', since: '', asked: '' });
  const earliest = (into, k, w) => {
    if (w && (!into[k] || w < into[k])) into[k] = w;
  };
  const addName = (into, n) => {
    const k = nameKey(n);
    if (k && !into.names.some((x) => nameKey(x) === k)) into.names.push(clean(n).replace(/\s+/g, ' '));
  };
  const addPhone = (into, t) => {
    const k = phoneId(t);
    if (k && !into.phones.some((x) => phoneId(x) === k)) into.phones.push(clean(t));
  };
  const addEmail = (into, e) => {
    const k = emailKey(e);
    if (k && !into.emails.includes(k)) into.emails.push(k);
  };
  // a name on its own ("Mark") only matches a client you've told it belongs to (one of their other names)
  const keysOf = (x, nicks) => [
    ...arr(x.emails).map(emailKey).filter(Boolean).map((e) => `mail:${e}`),
    ...arr(x.phones).map(phoneKey).filter(Boolean).map((t) => `tel:${t}`),
    ...arr(x.names).filter(isFull).map((n) => `name:${nameKey(n)}`),
    ...arr(nicks).filter((n) => !isFull(n)).map((n) => `nick:${nameKey(n)}`),
  ];
  const fits = (person, name) => !name || !person.names.length || person.names.some((n) => !clash(n, name));
  const together = (a, b) => !a.names.length || !b.names.length || b.names.some((n) => fits(a, n));
  const shared = (person, name) => Math.max(0, ...person.names.map((n) => nameWords(n).filter((w) => nameWords(name).includes(w)).length));
  const absorb = (into, p) => {
    [...(p.names || [p.name]), ...arr(p.aliases)].forEach((n) => addName(into, n));
    [...arr(p.nicks), ...arr(p.aliases)].forEach((n) => {
      if (n && !into.nicks.some((x) => nameKey(x) === nameKey(n))) into.nicks.push(n);
    });
    [p.saved, ...arr(p.alsoSaved)].forEach((d) => {
      if (!d) return;
      if (!into.saved) into.saved = d;
      else if (d !== into.saved && !into.alsoSaved.includes(d)) into.alsoSaved.push(d);
    });
    (p.roles || [p.role]).forEach((r) => r && !into.roles.includes(r) && into.roles.push(r));
    arr(p.emails).forEach((e) => addEmail(into, e));
    arr(p.phones).forEach((t) => addPhone(into, t));
    if (p.booking && !into.shoots.includes(p.booking)) into.shoots.push(p.booking);
    if (p.enquiry && !into.enquiries.includes(p.enquiry)) into.enquiries.push(p.enquiry);
    arr(p.shoots).forEach((b) => !into.shoots.includes(b) && into.shoots.push(b));
    arr(p.enquiries).forEach((e) => !into.enquiries.includes(e) && into.enquiries.push(e));
    earliest(into, 'first', p.when);
    earliest(into, 'first', p.first);
    [p.when, p.last].filter(Boolean).forEach((w) => {
      if (w > into.last) into.last = w;
    });
    earliest(into, 'since', p.since);
    earliest(into, 'asked', p.asked);
  };
  const index = (person) =>
    keysOf(person, person.nicks).forEach((k) => {
      const list = byKey.get(k) || [];
      if (!list.includes(person)) list.push(person);
      byKey.set(k, list);
    });

  found.forEach((p) => {
    const own = { names: [p.name, ...arr(p.aliases)].filter(Boolean), emails: p.emails, phones: p.phones };
    const hits = [];
    keysOf(own, own.names).forEach((k) =>
      (byKey.get(k) || []).forEach((h) => {
        // a shared email or number doesn't make two clearly different people one
        if (!hits.includes(h) && (k.startsWith('name:') || k.startsWith('nick:') || fits(h, p.name))) hits.push(h);
      })
    );
    // the best match first: the one who shares most of their name
    hits.sort((a, b) => shared(b, p.name) - shared(a, p.name));
    const into = hits[0] || blank();
    if (!hits.length) people.push(into);
    // this record links people we had apart, so they're the same person (unless they clearly aren't)
    hits.slice(1).forEach((other) => {
      if (!together(into, other) || !together(other, into)) return;
      absorb(into, other);
      people.splice(people.indexOf(other), 1);
      byKey.forEach((list) => {
        const i = list.indexOf(other);
        if (i < 0) return;
        list.splice(i, 1);
        if (!list.includes(into)) list.push(into);
      });
    });
    absorb(into, p);
    index(into);
  });

  const keys = new Set();
  return people
    .filter((p) => p.names.length || p.emails.length || p.phones.length)
    .map((p) => {
      const list = withDays(p.shoots);
      const sums = shootSums(list, today);
      // a client since you saved them, or since their first shoot was booked (never a date still to come)
      const start = dayOf(p.saved && p.saved.addedAt) || p.since || p.asked || today;
      // their name: as saved, or the fullest one they've used
      const name = (p.saved && clean(p.saved.name)) || [...p.names].sort((a, b) => nameWords(b).length - nameWords(a).length)[0] || '';
      // other names they've gone by (not just a shorter form of their name)
      const otherNames = p.names.filter((n) => nameKey(n) !== nameKey(name) && !nameWords(n).every((w) => nameWords(name).includes(w)));
      let key = p.saved ? p.saved._baseId : `auto-${p.emails[0] || nameKey(name).replace(/\s+/g, '-') || phoneId(p.phones[0])}`;
      for (let n = 2; keys.has(key); n += 1) key = `${key.replace(/-\d+$/, '')}-${n}`;
      keys.add(key);
      return {
        key,
        saved: p.saved,
        alsoSaved: p.alsoSaved,
        name,
        otherNames,
        roles: p.saved && clean(p.saved.role) ? [clean(p.saved.role), ...p.roles.filter((r) => r !== clean(p.saved.role))] : p.roles,
        emails: p.emails,
        phones: p.phones,
        notes: (p.saved && p.saved.notes) || '',
        shoots: list,
        enquiries: [...p.enquiries].sort((a, b) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || ''))),
        addedAt: start > today ? today : start,
        last: p.last,
        lastShoot: sums.lastShoot,
        nextShoot: sums.nextShoot,
        stats: { ...sums.stats, enquiries: p.enquiries.length },
      };
    })
    .sort((a, b) => b.stats.shoots - a.stats.shoots || Number(Boolean(b.saved)) - Number(Boolean(a.saved)) || String(b.last).localeCompare(String(a.last)) || a.name.localeCompare(b.name));
}

/* ---------- finding and ordering ---------- */

export function filterClients(list, { show = 'all', category = '', q = '' } = {}) {
  const words = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
  return arr(list).filter((c) => {
    if (show === 'upcoming' && !c.nextShoot) return false;
    if (show === 'owed' && !(c.stats.owed > 0)) return false;
    if (category === 'none' && c.category) return false;
    if (category && category !== 'none' && c.category !== category) return false;
    return words.every((w) => c.search.includes(w));
  });
}

const az = (a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' });

export function sortClients(list, by = 'recent') {
  const l = [...arr(list)];
  switch (by) {
    case 'az':
      return l.sort(az);
    case 'za':
      return l.sort((a, b) => az(b, a));
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
    return isBooked(b) && !orgKeyed(k.company) && !contactKeys(k).length && !k.enquiry && !nameKey(k.name);
  });
