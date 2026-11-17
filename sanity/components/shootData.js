'use client';

/* Loads your booked shoots (and enquiries) for the calendar and the dashboard, and keeps them live. */

import { useCallback, useEffect, useState } from 'react';
import { useClient } from 'sanity';
import { computeBudget, latestById, nextDayOf, shootDays } from '../bookingData';

export const SHOOTS_QUERY = `{
  "bookings": *[_type == "booking"]{
    _id, _updatedAt, title, status, kind, date, endDate, startTime, endTime, deliveryDate, budgetAmount, bookedAt,
    "moreDays": moreDays[]{ _key, date, startTime, endTime, note },
    client{ name, company, email, phone, budget, "enquiry": enquiry._ref },
    "locations": locations[]{ name, address, hireFee, clientPays, paid },
    "people": people[]{ role, name, rate, rateUnit, qty, clientPays, paid },
    "costs": costs[]{ category, qty, rate, clientPays, paid },
    "quote": quote[]{ qty, rate },
    "payments": payments[]{ amount },
    "schedule": schedule[]{ _key, dayNo, time, text },
    "kit": kit[]->name
  },
  "enquiries": *[_type == "enquiry"] | order(receivedAt desc)[0...80]{ _id, name, company, service, budget, details, receivedAt, replied, declined, "call": call{ date, time } }
}`;

/** a shoot with its sums and days worked out */
export const withMoney = (b) => ({ ...b, money: computeBudget(b), days: shootDays(b) });

function prepare(res) {
  const r = res || {};
  return {
    bookings: latestById(r.bookings).map(withMoney),
    enquiries: latestById(r.enquiries).sort((a, b) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || ''))),
  };
}

export function useShootData() {
  const client = useClient({ apiVersion: '2024-10-01' });
  const [data, setData] = useState(null);

  const load = useCallback(
    () =>
      client
        .fetch(SHOOTS_QUERY)
        .then((res) => setData(prepare(res)))
        .catch(() => setData((d) => d || { bookings: [], enquiries: [], error: true })),
    [client]
  );

  useEffect(() => {
    let alive = true;
    let timer = null;
    load();
    let sub = null;
    try {
      sub = client.listen('*[_type in ["booking", "enquiry"]]', {}, { visibility: 'query' }).subscribe({
        next: () => {
          clearTimeout(timer);
          timer = setTimeout(() => alive && load(), 500);
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
  }, [client, load]);

  return { data, setData, load, client };
}

/** shoots that haven't finished yet, by their next day (cancelled ones left out) */
export function upcomingOf(bookings, today) {
  return (bookings || [])
    .filter((b) => b.status !== 'cancelled' && b.days.length && b.days[b.days.length - 1] >= today)
    .map((b) => ({ ...b, next: nextDayOf(b, today) }))
    .sort((a, b) => a.next.localeCompare(b.next) || String(a.startTime || '').localeCompare(String(b.startTime || '')));
}

/** enquiries with no shoot booked yet, leaving out ones marked "Not going ahead" */
export function unbookedOf(enquiries, bookings) {
  const booked = new Set((bookings || []).map((b) => b.client && b.client.enquiry).filter(Boolean));
  return (enquiries || []).filter((e) => !booked.has(e._baseId) && !e.declined);
}

/** tick an enquiry off (as replied to) once a shoot is linked to it; quietly does nothing if it can't */
export async function tickEnquiry(client, id) {
  const base = String(id || '').replace(/^drafts\./, '');
  if (!client || !base) return;
  try {
    const ids = await client.fetch('*[_id in [$id, $draft] && replied != true]._id', { id: base, draft: `drafts.${base}` });
    await Promise.all((ids || []).map((x) => client.patch(x).set({ replied: true }).commit()));
  } catch {
    // not worth interrupting you for: you can still tick it yourself
  }
}

/** move a shoot on (e.g. shot → edited) straight from a list */
export function setShootStatus(client, setData, b, status) {
  const put = (st) => setData((d) => d && { ...d, bookings: d.bookings.map((x) => (x._baseId === b._baseId ? { ...x, status: st } : x)) });
  put(status);
  return client
    .patch(b._id)
    .set({ status })
    .commit()
    .catch(() => put(b.status));
}

/** mark an enquiry as "Not going ahead" so it drops off the lists */
export function declineEnquiry(client, setData, e) {
  setData((d) => d && { ...d, enquiries: d.enquiries.map((x) => (x._baseId === e._baseId ? { ...x, declined: true } : x)) });
  return client
    .patch(e._id)
    .set({ declined: true })
    .commit()
    .catch(() => setData((d) => d && { ...d, enquiries: d.enquiries.map((x) => (x._baseId === e._baseId ? { ...x, declined: false } : x)) }));
}

/** open the new-shoot form, with a date and/or an enquiry already filled in */
export function bookShoot(router, { date, enquiryId, client } = {}) {
  const payload = {};
  if (date) payload.date = date;
  if (enquiryId) payload.enquiryId = enquiryId;
  // a client from the Clients page: their name and contact details go on the new shoot
  if (!enquiryId && client) {
    ['company', 'name', 'email', 'phone'].forEach((k) => {
      if (typeof client[k] === 'string' && client[k].trim()) payload[k] = client[k].trim();
    });
  }
  router.navigateIntent('create', [{ type: 'booking', template: 'booking-new' }, payload]);
}
