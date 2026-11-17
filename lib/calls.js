/* Booking a call from the enquiry form: the hours you take calls, and which of them your calendar has free.
   Shared by /api/availability (the times the form offers) and /api/enquiry (which checks the time is still free). */

import { addDays, dayInfo, parseYmd, scheduleFor, shootDays, ymdInZone } from '@/sanity/bookingData';

export const CALL_MINUTES = 60; // every call takes up one hour on your calendar
export const CALL_ZONE = 'Europe/London';
export const SHOOT_BUFFER = 60; // no calls in the hour before or after a shoot, for getting there and packing up

export const WEEKDAYS = [
  { value: 'mon', title: 'Mon' },
  { value: 'tue', title: 'Tue' },
  { value: 'wed', title: 'Wed' },
  { value: 'thu', title: 'Thu' },
  { value: 'fri', title: 'Fri' },
  { value: 'sat', title: 'Sat' },
  { value: 'sun', title: 'Sun' },
];
const DAY_BY_INDEX = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const CALL_WEEKS = [1, 2, 3, 4, 6, 8];
const DEFAULTS = { days: ['mon', 'tue', 'wed', 'thu', 'fri'], from: '09:00', to: '17:00', weeks: 3 };

export const toMin = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const pad = (n) => String(n).padStart(2, '0');
export const hhmm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** a date's weekday ('mon'…), worked out the same on any server */
export function weekdayOf(day) {
  const [y, mo, d] = String(day).split('-').map(Number);
  return DAY_BY_INDEX[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
}

/** "Tuesday 24 November" */
export function longDay(day) {
  const [y, mo, d] = String(day).split('-').map(Number);
  if (!y || !mo || !d) return String(day || '');
  return new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

/** "Tuesday 24 November, 10:00 to 11:00" */
export function callLabel(call) {
  if (!call || !call.date || toMin(call.time) === null) return '';
  return `${longDay(call.date)}, ${call.time} to ${hhmm(toMin(call.time) + CALL_MINUTES)}`;
}

/** your call settings from the Contact page, with sensible defaults for anything not set */
export function callSettings(c) {
  const x = c || {};
  const days = Array.isArray(x.callDays) ? x.callDays.filter((d) => DAY_BY_INDEX.includes(d)) : [];
  const from = toMin(x.callFrom) !== null ? x.callFrom : DEFAULTS.from;
  let to = toMin(x.callTo) !== null ? x.callTo : DEFAULTS.to;
  if (toMin(to) - toMin(from) < CALL_MINUTES) to = hhmm(Math.min(toMin(from) + CALL_MINUTES, 24 * 60));
  return {
    on: x.callsOn !== false,
    days: days.length ? days : DEFAULTS.days,
    from,
    to,
    weeks: CALL_WEEKS.includes(x.callWeeks) ? x.callWeeks : DEFAULTS.weeks,
  };
}

/** the busy stretches of each day: shoots (with an hour either side) and calls already booked */
export function busyByDay(bookings, calls) {
  const busy = new Map();
  const add = (d, a, b) => {
    if (!busy.has(d)) busy.set(d, []);
    busy.get(d).push([a, b]);
  };
  (bookings || []).forEach((b) => {
    if (!b || b.status === 'cancelled') return;
    shootDays(b).forEach((d) => {
      const info = dayInfo(b, d);
      const plan = scheduleFor(b, d).map((s) => toMin(s.time)).filter((m) => m !== null);
      const start = [toMin(info.start), ...plan].filter((m) => m !== null);
      if (!start.length) return add(d, 0, 24 * 60); // no times yet: keep the whole day clear
      const first = Math.min(...start);
      const set = toMin(info.end);
      const last = plan.length ? Math.max(...plan) : null;
      const end = Math.max(set !== null ? set : first + 120, last !== null ? last + 30 : 0, first + 30);
      return add(d, first - SHOOT_BUFFER, end + SHOOT_BUFFER);
    });
  });
  (calls || []).forEach((c) => {
    const call = c && c.call;
    const at = call ? toMin(call.time) : null;
    if (!call || !parseYmd(call.date) || at === null) return;
    add(String(call.date).slice(0, 10), at, at + CALL_MINUTES);
  });
  return busy;
}

/** the free hours from tomorrow, for as many weeks ahead as you've chosen: [{ date, slots: ['09:00', …] }] */
export function freeSlots(settings, busy, now = new Date()) {
  const out = [];
  if (!settings || !settings.on) return out;
  const first = addDays(ymdInZone(now, CALL_ZONE), 1);
  const from = toMin(settings.from);
  const to = toMin(settings.to);
  for (let i = 0; i < settings.weeks * 7; i += 1) {
    const day = addDays(first, i);
    if (!settings.days.includes(weekdayOf(day))) continue;
    const taken = busy.get(day) || [];
    const slots = [];
    for (let m = from; m + CALL_MINUTES <= to; m += CALL_MINUTES) {
      if (!taken.some(([a, b]) => m < b && m + CALL_MINUTES > a)) slots.push(hhmm(m));
    }
    if (slots.length) out.push({ date: day, slots });
  }
  return out;
}

export const CALLS_QUERY = `{
  "contact": *[_id == "contactPage"][0]{ callsOn, callDays, callFrom, callTo, callWeeks },
  "bookings": *[_type == "booking" && status != "cancelled"]{
    _id, status, date, endDate, startTime, endTime,
    "moreDays": moreDays[]{ _key, date, startTime, endTime },
    "schedule": schedule[]{ dayNo, time }
  },
  "calls": *[_type == "enquiry" && defined(call.date) && declined != true]{ _id, call }
}`;

/** everything the form needs, read fresh. Pass a client made with perspective 'raw', so drafts count too
    (a shoot you're still creating is busy time). */
export async function openTimes(client, now = new Date()) {
  const res = (await client.fetch(CALLS_QUERY, {}, { cache: 'no-store' })) || {};
  const settings = callSettings(res.contact);
  return { settings, days: freeSlots(settings, busyByDay(res.bookings, res.calls), now) };
}
