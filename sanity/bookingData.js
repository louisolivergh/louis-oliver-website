/* Booked shoots: the lists, and every sum, in one place.
   Plain JavaScript (no Sanity imports), so the calendar, the shoot form and the dashboard
   all work the numbers out exactly the same way. */

/* ---------- lists ---------- */

export const STATUSES = [
  { value: 'pencilled', title: 'Pencilled in', short: 'Pencilled in' },
  { value: 'confirmed', title: 'Confirmed', short: 'Confirmed' },
  { value: 'shot', title: 'Shot — editing', short: 'Editing' },
  { value: 'delivered', title: 'Delivered', short: 'Delivered' },
  { value: 'cancelled', title: 'Cancelled', short: 'Cancelled' },
];
export const statusOf = (v) => STATUSES.find((s) => s.value === v) || STATUSES[0];

export const KINDS = [
  { value: 'photo', title: 'Photo' },
  { value: 'video', title: 'Video' },
  { value: 'both', title: 'Photo + video' },
];

export const COST_CATEGORIES = [
  { value: 'location', title: 'Location hire' },
  { value: 'studio', title: 'Studio hire' },
  { value: 'talent', title: 'Models & actors' },
  { value: 'crew', title: 'Crew & assistants' },
  { value: 'styling', title: 'Hair, makeup & styling' },
  { value: 'kit', title: 'Equipment hire' },
  { value: 'props', title: 'Props, set & wardrobe' },
  { value: 'travel', title: 'Travel & mileage' },
  { value: 'stay', title: 'Accommodation' },
  { value: 'food', title: 'Food & drink' },
  { value: 'permits', title: 'Permits & insurance' },
  { value: 'post', title: 'Editing & post-production' },
  { value: 'music', title: 'Music & licences' },
  { value: 'other', title: 'Other' },
];
export const categoryTitle = (v) => (COST_CATEGORIES.find((c) => c.value === v) || COST_CATEGORIES[COST_CATEGORIES.length - 1]).title;

export const UNITS = [
  { value: 'item', title: 'each', short: '' },
  { value: 'day', title: 'per day', short: '/day' },
  { value: 'hour', title: 'per hour', short: '/hr' },
  { value: 'person', title: 'per person', short: '/person' },
  { value: 'night', title: 'per night', short: '/night' },
  { value: 'mile', title: 'per mile', short: '/mile' },
];
export const unitShort = (v) => (UNITS.find((u) => u.value === v) || UNITS[0]).short;

export const ROLES = [
  { value: 'model', title: 'Model', category: 'talent' },
  { value: 'actor', title: 'Actor', category: 'talent' },
  { value: 'presenter', title: 'Presenter', category: 'talent' },
  { value: 'extra', title: 'Extra', category: 'talent' },
  { value: 'assistant', title: 'Assistant', category: 'crew' },
  { value: 'second', title: 'Second shooter', category: 'crew' },
  { value: 'videographer', title: 'Videographer', category: 'crew' },
  { value: 'sound', title: 'Sound recordist', category: 'crew' },
  { value: 'drone', title: 'Drone pilot', category: 'crew' },
  { value: 'producer', title: 'Producer', category: 'crew' },
  { value: 'driver', title: 'Driver / runner', category: 'crew' },
  { value: 'hmua', title: 'Hair & makeup', category: 'styling' },
  { value: 'stylist', title: 'Stylist', category: 'styling' },
  { value: 'contact', title: 'Client contact', category: 'crew' },
  { value: 'other', title: 'Other', category: 'crew' },
];
export const roleOf = (v) => ROLES.find((r) => r.value === v) || null;

export const RATE_UNITS = [
  { value: 'day', title: 'per day' },
  { value: 'hour', title: 'per hour' },
  { value: 'flat', title: 'flat fee' },
];

export const LOCATION_TYPES = [
  { value: 'studio', title: 'Studio' },
  { value: 'client', title: 'Client’s premises' },
  { value: 'indoor', title: 'Indoor venue' },
  { value: 'outdoor', title: 'Outdoors' },
  { value: 'home', title: 'Private home' },
  { value: 'other', title: 'Other' },
];

export const LINK_KINDS = [
  { value: 'moodboard', title: 'Moodboard' },
  { value: 'callsheet', title: 'Call sheet' },
  { value: 'contract', title: 'Contract' },
  { value: 'quote', title: 'Quote' },
  { value: 'invoice', title: 'Invoice' },
  { value: 'gallery', title: 'Gallery / delivery' },
  { value: 'files', title: 'Files' },
  { value: 'other', title: 'Other' },
];

/* every 15 minutes, 5am to 11:45pm */
export const TIME_OPTIONS = (() => {
  const out = [];
  for (let h = 5; h < 24; h += 1) {
    for (let m = 0; m < 60; m += 15) {
      const v = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      out.push({ value: v, title: v });
    }
  }
  return out;
})();

/* ---------- money ---------- */

const arr = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);
export const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const round2 = (n) => Math.round(n * 100) / 100;
const sum = (list) => list.reduce((a, b) => a + b, 0);

const GBP0 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const GBP2 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** £1,250 — pence only when there are some */
export const money = (n) => {
  const v = round2(num(n));
  return Number.isInteger(v) ? GBP0.format(v) : GBP2.format(v);
};
/** £1.2k for tight spaces */
export const moneyShort = (n) => {
  const v = num(n);
  if (Math.abs(v) >= 10000) return `£${Math.round(v / 1000)}k`;
  if (Math.abs(v) >= 1000) return `£${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return money(Math.round(v));
};
export const percent = (r) => (typeof r === 'number' && Number.isFinite(r) ? `${Math.round(r * 100)}%` : '–');

/** quantity × rate (an empty quantity counts as 1) */
export function lineTotal(line) {
  if (!line) return 0;
  const q = typeof line.qty === 'number' && Number.isFinite(line.qty) ? line.qty : 1;
  return round2(q * num(line.rate));
}

/** what a person costs: day/hour rate × how many, or a flat fee */
export function personCost(p) {
  if (!p) return 0;
  const rate = num(p.rate);
  if (!rate) return 0;
  if (p.rateUnit === 'flat') return round2(rate);
  const q = typeof p.qty === 'number' && Number.isFinite(p.qty) ? p.qty : 1;
  return round2(rate * q);
}

/** "£1k–£3k", "Under £500", "£5,000+" → the top figure, or null */
export function parseBudget(text) {
  if (typeof text !== 'string') return null;
  const found = [...text.replace(/,/g, '').matchAll(/(\d+(?:\.\d+)?)\s*([kK])?/g)]
    .map((m) => parseFloat(m[1]) * (m[2] ? 1000 : 1))
    .filter((n) => n > 0);
  return found.length ? Math.max(...found) : null;
}

/** Everything about a shoot's money, worked out from what's filled in. */
export function computeBudget(doc) {
  const d = doc && typeof doc === 'object' ? doc : {};
  const income = round2(sum(arr(d.quote).map(lineTotal)));

  const items = [];
  arr(d.locations).forEach((l) => {
    const amount = round2(num(l.hireFee));
    if (amount) items.push({ key: l._key, source: 'locations', category: 'location', label: l.name || 'Location', amount, clientPays: Boolean(l.clientPays), paid: Boolean(l.paid) });
  });
  arr(d.people).forEach((p) => {
    const amount = personCost(p);
    const role = roleOf(p.role);
    if (amount) items.push({ key: p._key, source: 'people', category: role ? role.category : 'crew', label: [role && role.title, p.name].filter(Boolean).join(' — ') || 'Person', amount, clientPays: Boolean(p.clientPays), paid: Boolean(p.paid) });
  });
  arr(d.costs).forEach((c) => {
    const amount = lineTotal(c);
    if (amount) items.push({ key: c._key, source: 'costs', category: c.category || 'other', label: c.label || categoryTitle(c.category), amount, clientPays: Boolean(c.clientPays), paid: Boolean(c.paid) });
  });

  const mine = items.filter((i) => !i.clientPays);
  const costs = round2(sum(mine.map((i) => i.amount)));
  const covered = round2(sum(items.filter((i) => i.clientPays).map((i) => i.amount)));
  const toPayOut = round2(sum(mine.filter((i) => !i.paid).map((i) => i.amount)));
  const profit = round2(income - costs);
  const margin = income > 0 ? profit / income : null;
  const paid = round2(sum(arr(d.payments).map((p) => num(p.amount))));
  const outstanding = round2(Math.max(0, income - paid));

  const groups = {};
  mine.forEach((i) => {
    groups[i.category] = groups[i.category] || { category: i.category, title: categoryTitle(i.category), amount: 0, count: 0 };
    groups[i.category].amount = round2(groups[i.category].amount + i.amount);
    groups[i.category].count += 1;
  });
  const byCategory = Object.values(groups).sort((a, b) => b.amount - a.amount);

  const budget = typeof d.budgetAmount === 'number' && d.budgetAmount > 0 ? d.budgetAmount : parseBudget(d.client && d.client.budget);
  const days = shootDays(d).length || 1;

  let payState = 'none';
  if (income > 0) payState = paid <= 0 ? 'unpaid' : paid + 0.005 >= income ? 'paid' : 'part';

  return { income, costs, covered, toPayOut, profit, margin, paid, outstanding, byCategory, items, budget, days, payState };
}

/* ---------- dates (all as YYYY-MM-DD, in your own time zone) ---------- */

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export function parseYmd(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
export const todayYmd = () => ymd(new Date());
export function addDays(s, n) {
  const d = parseYmd(s);
  if (!d) return s;
  d.setDate(d.getDate() + n);
  return ymd(d);
}
export function daysBetween(a, b) {
  const x = parseYmd(a);
  const y = parseYmd(b);
  if (!x || !y) return 0;
  return Math.round((y - x) / 86400000);
}
export function fmtDay(s, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const d = parseYmd(s);
  return d ? d.toLocaleDateString('en-GB', opts) : '';
}
/** "Today", "Tomorrow", "In 5 days", "3 days ago", or a date */
export function relDay(s) {
  if (!parseYmd(s)) return '';
  const n = daysBetween(todayYmd(), s);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 1 && n < 14) return `In ${n} days`;
  if (n >= 14 && n < 60) return `In ${Math.round(n / 7)} weeks`;
  if (n < -1 && n > -14) return `${-n} days ago`;
  return fmtDay(s, { day: 'numeric', month: 'short', year: 'numeric' });
}
export const timeRange = (a, b) => (a && b ? `${a}–${b}` : a || '');

/** every day the shoot runs, first to last */
export function shootDays(b) {
  if (!b || !parseYmd(b.date)) return [];
  const last = parseYmd(b.endDate) && b.endDate > b.date ? b.endDate : b.date;
  const out = [];
  for (let s = b.date; s <= last && out.length < 62; s = addDays(s, 1)) out.push(s);
  return out;
}

/* ---------- people & names ---------- */

export function bookingTitle(b) {
  if (!b) return 'New shoot';
  const c = b.client || {};
  return (typeof b.title === 'string' && b.title.trim()) || c.company || c.name || 'New shoot';
}
export function clientLine(b) {
  const c = (b && b.client) || {};
  return [c.name, c.company].filter(Boolean).join(' · ');
}
export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/* What a shoot copies from the enquiry it came from */
export const CLIENT_KEYS = ['name', 'company', 'email', 'phone', 'service', 'budget', 'message', 'enquiredAt'];
export function clientFromEnquiry(id, e) {
  const src = e || {};
  const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const out = { enquiry: { _type: 'reference', _ref: String(id).replace(/^drafts\./, ''), _weak: true } };
  const map = { name: 'name', company: 'company', email: 'email', phone: 'phone', service: 'service', budget: 'budget', message: 'details' };
  Object.keys(map).forEach((to) => {
    const v = clean(src[map[to]]);
    if (v) out[to] = v;
  });
  if (src.receivedAt) out.enquiredAt = src.receivedAt;
  return out;
}

/** a link that opens the place in Google Maps */
export const mapsUrl = (q) => (q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '');

/** newest version of each document (the editing copy wins over the saved one) */
export function latestById(list) {
  const by = new Map();
  (Array.isArray(list) ? list : []).forEach((d) => {
    if (!d || !d._id) return;
    const id = d._id.replace(/^drafts\./, '');
    const isDraft = d._id.startsWith('drafts.');
    const prev = by.get(id);
    if (!prev || (isDraft && !prev._isDraft)) by.set(id, { ...d, _baseId: id, _isDraft: isDraft });
  });
  return [...by.values()];
}
