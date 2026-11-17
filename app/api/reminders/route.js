import { createClient } from 'next-sanity';
import { NextResponse } from 'next/server';
import { apiVersion, dataset, projectId } from '@/sanity/env';
import { nextDayOf, reminderPlan, ymdInZone } from '@/sanity/bookingData';
import { REMINDER_FIELDS, newestCopies, reminderEmail, sendReminderEmail } from '@/lib/reminders';

/* Shoot reminders.
   GET:  run every morning by Vercel (see vercel.json): emails any reminder that's due today.
   POST: "Send a test now" on a shoot: emails that shoot's reminder straight away.
   Emails go to contact@louisoliver.co.uk. Shoots are private, so this reads them with the server's token. */

export const dynamic = 'force-dynamic';

function sanity() {
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!projectId || !token) return null;
  return createClient({ projectId, dataset, apiVersion, token, useCdn: false, perspective: 'raw' });
}

export async function GET(req) {
  // if CRON_SECRET is set in Vercel, only Vercel's own scheduler can run this
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const client = sanity();
  if (!client) return NextResponse.json({ ok: false, reason: 'Sanity is not set up on this deployment.' }, { status: 503 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ ok: false, reason: 'RESEND_API_KEY is not set on this deployment.' }, { status: 503 });

  const today = ymdInZone(new Date(), 'Europe/London');
  const shoots = newestCopies(await client.fetch(`*[_type == "booking" && count(reminders) > 0 && status != "cancelled"]${REMINDER_FIELDS}`));
  let sent = 0;
  const problems = [];

  for (const b of shoots) {
    const due = reminderPlan(b, today).filter((p) => p.state === 'due');
    if (!due.length) continue;
    const tokens = due.map((p) => p.token);
    // claim these reminders first, so a second run (or a second copy of the site) can't send them again
    try {
      await client.patch(b._id).ifRevisionId(b._rev).setIfMissing({ remindersSent: [] }).append('remindersSent', tokens).commit();
    } catch {
      continue; // it changed since we looked, tomorrow's run will pick it up
    }
    // one email per shoot day, even if two reminders for it are due
    const daysDue = [...new Set(due.map((p) => p.day))];
    for (const day of daysDue) {
      const result = await sendReminderEmail(reminderEmail(b, { day, today }));
      if (result.ok) {
        sent += 1;
      } else {
        problems.push(result.reason);
        // let it try again tomorrow
        const failed = due.filter((p) => p.day === day).map((p) => `remindersSent[@ == "${p.token}"]`);
        await client
          .patch(b._id)
          .unset(failed)
          .commit()
          .catch(() => {});
      }
    }
  }
  return NextResponse.json({ ok: problems.length === 0, today, checked: shoots.length, sent, problems });
}

export async function POST(req) {
  // only from the dashboard on this site
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ ok: false }, { status: 403 });
  const client = sanity();
  if (!client) return NextResponse.json({ ok: false, reason: 'Sanity is not set up on this deployment.' }, { status: 503 });
  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const id = String(body.id || '').replace(/^drafts\./, '');
  if (!/^[\w.-]{1,120}$/.test(id)) return NextResponse.json({ ok: false, reason: 'Unknown shoot.' }, { status: 400 });

  const [b] = newestCopies(await client.fetch(`*[_type == "booking" && _id in [$id, $draft]]${REMINDER_FIELDS}`, { id, draft: `drafts.${id}` }));
  if (!b) return NextResponse.json({ ok: false, reason: 'That shoot isn’t saved yet.' }, { status: 404 });

  const today = ymdInZone(new Date(), 'Europe/London');
  const result = await sendReminderEmail(reminderEmail(b, { day: nextDayOf(b, today), today, test: true }));
  return NextResponse.json(result.ok ? { ok: true, to: result.to } : { ok: false, reason: result.reason }, { status: result.ok ? 200 : 502 });
}
