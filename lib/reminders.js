/* Shoot reminder emails (via Resend), sent to contact@louisoliver.co.uk.
   Used by app/api/reminders/route.js: every morning for reminders that are due, or straight away as a test. */

import {
  bookingTitle,
  computeBudget,
  daysBetween,
  dayInfo,
  fmtDay,
  isBooked,
  mapsUrl,
  money,
  roleOf,
  scheduleFor,
  shootDays,
  statusOf,
  timeRange,
} from '@/sanity/bookingData';

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const REMINDER_TO = () => process.env.REMINDER_EMAIL || process.env.NOTIFY_EMAIL || 'contact@louisoliver.co.uk';
const FROM = () => process.env.NOTIFY_FROM || 'Louis Oliver Website <onboarding@resend.dev>';
const SITE = () => String(process.env.SITE_URL || 'https://louisoliver.co.uk').replace(/\/$/, '');

/* everything a reminder needs about a shoot */
export const REMINDER_FIELDS = `{
  _id, _rev, title, status, kind, date, endDate, startTime, endTime, bookedAt, budgetAmount,
  "moreDays": moreDays[]{ _key, date, startTime, endTime, note },
  reminders, remindersSent,
  client{ name, company, email, phone, budget },
  "locations": locations[]{ name, address, contact, phone, notes, hireFee, clientPays, paid },
  "people": people[]{ role, name, phone, rate, rateUnit, qty, clientPays, paid, notes },
  "quote": quote[]{ qty, rate },
  "costs": costs[]{ category, qty, rate, clientPays, paid },
  "payments": payments[]{ amount },
  "schedule": schedule[]{ _key, dayNo, time, text },
  "shots": count(shotList),
  "kit": kit[]->name,
  brief, deliverables, deliveryDate,
  "lastNote": notes[0]{ date, text }
}`;

/** the newest copy of each shoot (the one being edited wins) */
export function newestCopies(list) {
  const by = new Map();
  (Array.isArray(list) ? list : []).forEach((d) => {
    if (!d || !d._id) return;
    const id = d._id.replace(/^drafts\./, '');
    const draft = d._id.startsWith('drafts.');
    const prev = by.get(id);
    if (!prev || (draft && !prev._id.startsWith('drafts.'))) by.set(id, d);
  });
  return [...by.values()];
}

function whenWords(today, day) {
  const n = daysBetween(today, day);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n > 1) return `in ${n} days`;
  return `${-n} day${n === -1 ? '' : 's'} ago`;
}

/** builds the email for one day of a shoot */
export function reminderEmail(b, { day, today, test = false }) {
  const id = String(b._id || '').replace(/^drafts\./, '');
  const days = shootDays(b);
  const theDay = day || days[0] || '';
  const info = theDay ? dayInfo(b, theDay) : { start: '', end: '', note: '' };
  const title = bookingTitle(b);
  const c = b.client || {};
  const money$ = computeBudget(b);
  const long = theDay ? fmtDay(theDay, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'No date yet';
  const rel = theDay ? whenWords(today, theDay) : '';
  const open = `${SITE()}/studio/intent/edit/id=${encodeURIComponent(id)};type=booking`;
  const locs = (Array.isArray(b.locations) ? b.locations : []).filter((l) => l && (l.name || l.address));
  const people = (Array.isArray(b.people) ? b.people : []).filter((p) => p && (p.name || p.role));
  const schedule = theDay ? scheduleFor(b, theDay) : (Array.isArray(b.schedule) ? b.schedule : []).filter((s) => s && (s.time || s.text));
  const kit = (Array.isArray(b.kit) ? b.kit : []).filter(Boolean);

  const rows = [
    ['When', `${long}${info.start ? ` · ${timeRange(info.start, info.end)}` : ''}`],
    days.length > 1 ? ['Shoot days', `Day ${days.indexOf(theDay) + 1} of ${days.length}${info.note ? ` · ${info.note}` : ''}`] : null,
    ['Client', [c.name, c.company].filter(Boolean).join(' · ')],
    c.phone ? ['Phone', `<a href="tel:${esc(String(c.phone).replace(/[^\d+]/g, ''))}" style="color:#104de6">${esc(c.phone)}</a>`, true] : null,
    c.email ? ['Email', `<a href="mailto:${esc(c.email)}" style="color:#104de6">${esc(c.email)}</a>`, true] : null,
    ['Status', isBooked(b) ? statusOf(b.status).title : 'Not saved yet. Open it and press Save shoot'],
    money$.income ? ['Money', `${money(money$.income)} price · ${money$.payState === 'paid' ? 'paid in full' : `${money(money$.outstanding)} still to come in`}`] : null,
  ].filter((r) => r && r[1]);

  const section = (heading, body) => `
        <div style="margin-top:22px">
          <div style="font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#104de6">${heading}</div>
          <div style="margin-top:8px;font-size:15px;line-height:1.6">${body}</div>
        </div>`;

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;background:#f4f7fd;padding:32px 16px;color:#0b1220">
    <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e6eaf1">
      <div style="background:#104de6;color:#ffffff;padding:28px 28px 24px">
        <div style="font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;opacity:.85">${test ? 'Test reminder' : 'Shoot reminder'}${rel ? ` · ${esc(rel)}` : ''}</div>
        <div style="font-size:26px;font-weight:600;margin-top:6px;line-height:1.15">${esc(title)}</div>
        <div style="font-size:15px;margin-top:8px;opacity:.9">${esc(long)}${info.start ? ` · ${esc(timeRange(info.start, info.end))}` : ''}</div>
      </div>
      <div style="padding:24px 28px 28px">
        <table style="width:100%;border-collapse:collapse;font-size:15px">
          ${rows.map(([k, v, raw]) => `<tr><td style="padding:7px 0;color:#5b6475;width:110px;vertical-align:top">${k}</td><td style="padding:7px 0;font-weight:600">${raw ? v : esc(v)}</td></tr>`).join('')}
        </table>
        ${locs.length ? section('Where', locs.map((l) => `<div style="margin-bottom:10px"><b>${esc(l.name || l.address)}</b>${l.address && l.name ? `<br>${esc(l.address)}` : ''}${l.contact || l.phone ? `<br><span style="color:#5b6475">Ask for ${esc([l.contact, l.phone].filter(Boolean).join(' · '))}</span>` : ''}${l.notes ? `<br><span style="color:#5b6475">${esc(l.notes)}</span>` : ''}<br><a href="${esc(mapsUrl([l.name, l.address].filter(Boolean).join(', ')))}" style="color:#104de6">Open in Google Maps →</a></div>`).join('')) : ''}
        ${schedule.length ? section('On the day', schedule.map((s) => `<div><b style="display:inline-block;min-width:58px">${esc(s.time || '')}</b> ${esc(s.text || '')}</div>`).join('')) : ''}
        ${people.length ? section('Who’s coming', people.map((p) => `<div>${esc([roleOf(p.role) ? roleOf(p.role).title : '', p.name].filter(Boolean).join(' · '))}${p.phone ? ` · <a href="tel:${esc(String(p.phone).replace(/[^\d+]/g, ''))}" style="color:#104de6">${esc(p.phone)}</a>` : ''}${p.notes ? `<span style="color:#5b6475"> · ${esc(p.notes)}</span>` : ''}</div>`).join('')) : ''}
        ${kit.length ? section('Kit to pack', kit.map((k) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 10px;border-radius:999px;background:#eef3fe;color:#104de6;font-size:13px;font-weight:600">${esc(k)}</span>`).join('')) : ''}
        ${b.shots ? section('Shot list', `${b.shots} shot${b.shots === 1 ? '' : 's'} planned. Open the shoot to tick them off.`) : ''}
        ${b.brief ? section('The brief', `<div style="white-space:pre-line">${esc(b.brief)}</div>`) : ''}
        ${b.lastNote && b.lastNote.text ? section('Latest note from the client', `<div style="padding:14px 16px;border-radius:14px;background:#f4f7fd;white-space:pre-line">${esc(b.lastNote.text)}${b.lastNote.date ? `<div style="margin-top:6px;font-size:13px;color:#5b6475">${esc(fmtDay(b.lastNote.date, { day: 'numeric', month: 'short' }))}</div>` : ''}</div>`) : ''}
        <a href="${esc(open)}" style="display:inline-block;margin-top:26px;padding:14px 22px;border-radius:999px;background:#104de6;color:#ffffff;text-decoration:none;font-weight:600">Open the shoot →</a>
        ${locs[0] ? `<a href="${esc(mapsUrl([locs[0].name, locs[0].address].filter(Boolean).join(', ')))}" style="display:inline-block;margin:8px 0 0 8px;padding:14px 22px;border-radius:999px;background:#eef3fe;color:#104de6;text-decoration:none;font-weight:600">Directions</a>` : ''}
        <p style="margin:22px 0 0;font-size:13px;color:#5b6475">You picked this reminder on the shoot. Change your reminders under Shoots → this shoot → Overview.</p>
      </div>
    </div>
  </div>`;

  const text = [
    `${test ? 'Test reminder' : 'Shoot reminder'}${rel ? ` (${rel})` : ''}: ${title}`,
    '',
    ...rows.map(([k, v, raw]) => `${k}: ${raw ? String(v).replace(/<[^>]+>/g, '') : v}`),
    ...locs.map((l) => `Where: ${[l.name, l.address].filter(Boolean).join(', ')}`),
    ...schedule.map((s) => `${s.time || ''} ${s.text || ''}`.trim()),
    kit.length ? `Kit: ${kit.join(', ')}` : '',
    '',
    `Open the shoot: ${open}`,
  ]
    .filter((l) => l !== null)
    .join('\n');

  const subject = `${test ? 'Test reminder: ' : ''}${title}${theDay ? `, ${rel} (${fmtDay(theDay, { weekday: 'short', day: 'numeric', month: 'short' })})` : ' (no date yet)'}`;
  return { subject, html, text };
}

/** sends one email; never throws */
export async function sendReminderEmail({ subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  const to = REMINDER_TO();
  if (!key) return { ok: false, reason: 'Emails aren’t set up on this site yet (RESEND_API_KEY is missing).', to };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM(), to: [to], subject, html, text }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('Reminder email failed', res.status, body);
      return { ok: false, reason: `the email service said ${res.status}`, to };
    }
    return { ok: true, to };
  } catch (err) {
    console.error('Reminder email failed', err);
    return { ok: false, reason: 'the email service couldn’t be reached', to };
  }
}
