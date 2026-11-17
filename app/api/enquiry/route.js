import { createClient } from 'next-sanity';
import { NextResponse } from 'next/server';
import { apiVersion, dataset, projectId } from '@/sanity/env';
import { notify } from '@/lib/notify';
import { CALL_MINUTES, openTimes } from '@/lib/calls';

const clip = (v, n = 4000) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export async function POST(req) {
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!projectId || !token) {
    return NextResponse.json({ ok: false, error: 'Enquiries are not set up yet.' }, { status: 503 });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const doc = {
    _type: 'enquiry',
    replied: false,
    name: clip(body.name, 200),
    company: clip(body.company, 200),
    email: clip(body.email, 200),
    phone: clip(body.phone, 60),
    service: clip(body.service, 200),
    budget: clip(body.budget, 200),
    details: clip(body.details),
    receivedAt: new Date().toISOString(),
  };
  if (!doc.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doc.email)) {
    return NextResponse.json({ ok: false, error: 'Name and a valid email are required.' }, { status: 400 });
  }
  const callDate = clip(body.callDate, 10);
  const callTime = clip(body.callTime, 5);
  if ((callDate || callTime) && !(/^\d{4}-\d{2}-\d{2}$/.test(callDate) && /^\d{2}:\d{2}$/.test(callTime))) {
    return NextResponse.json({ ok: false, error: 'That call time isn’t valid.' }, { status: 400 });
  }
  try {
    const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false, perspective: 'raw' });
    if (callDate) {
      // the time they picked must still be free (someone else may have just taken it)
      const { days } = await openTimes(client);
      if (!days.some((d) => d.date === callDate && d.slots.includes(callTime))) {
        return NextResponse.json({ ok: false, error: 'taken' }, { status: 409 });
      }
      doc.call = { date: callDate, time: callTime, minutes: CALL_MINUTES };
    }
    await client.create(doc);
    await notify(doc, new URL(req.url).origin);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Enquiry save failed', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
