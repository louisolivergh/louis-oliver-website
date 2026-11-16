import { createClient } from 'next-sanity';
import { NextResponse } from 'next/server';
import { apiVersion, dataset, projectId } from '@/sanity/env';

const clip = (v, n = 4000) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const esc = (v) => String(v || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* Emails you about each new enquiry (via Resend). Never blocks the enquiry from saving. */
async function notify(doc, origin) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const to = process.env.NOTIFY_EMAIL || 'contact@louisoliver.co.uk';
  const from = process.env.NOTIFY_FROM || 'Louis Oliver Website <onboarding@resend.dev>';
  const site = (process.env.SITE_URL || origin || '').replace(/\/$/, '');
  const dashboard = `${site}/studio`;
  const rows = [
    ['Name', doc.name],
    ['Company', doc.company],
    ['Email', doc.email],
    ['Phone', doc.phone],
    ['Service', doc.service],
    ['Budget', doc.budget],
  ].filter(([, v]) => v);
  const html = `
  <div style="font-family:Inter,Arial,sans-serif;background:#f4f7fd;padding:32px 16px;color:#0b1220">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e6eaf1">
      <div style="background:#104de6;color:#ffffff;padding:28px 28px 24px">
        <div style="font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;opacity:.85">New enquiry</div>
        <div style="font-size:24px;font-weight:600;margin-top:6px">${esc(doc.name)}${doc.company ? ' · ' + esc(doc.company) : ''}</div>
      </div>
      <div style="padding:24px 28px">
        <table style="width:100%;border-collapse:collapse;font-size:15px">
          ${rows.map(([k, v]) => `<tr><td style="padding:8px 0;color:#5b6475;width:110px;vertical-align:top">${k}</td><td style="padding:8px 0;font-weight:600">${esc(v)}</td></tr>`).join('')}
        </table>
        ${doc.details ? `<div style="margin-top:16px;padding:16px;border-radius:14px;background:#f4f7fd;font-size:15px;line-height:1.6;white-space:pre-line">${esc(doc.details)}</div>` : ''}
        <p style="margin:24px 0 8px;font-size:15px">Remember to check your dashboard and tick it off once you’ve replied.</p>
        <a href="${esc(dashboard)}" style="display:inline-block;margin-top:8px;padding:14px 22px;border-radius:999px;background:#104de6;color:#ffffff;text-decoration:none;font-weight:600">Open dashboard →</a>
        <a href="mailto:${esc(doc.email)}" style="display:inline-block;margin:8px 0 0 8px;padding:14px 22px;border-radius:999px;background:#eef3fe;color:#104de6;text-decoration:none;font-weight:600">Reply to ${esc(doc.name)}</a>
      </div>
    </div>
  </div>`;
  const text = [
    `New enquiry from ${doc.name}${doc.company ? ' (' + doc.company + ')' : ''}`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    doc.details || '',
    '',
    `Check your dashboard and mark it as replied: ${dashboard}`,
  ].join('\n');
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: doc.email,
        subject: `New enquiry: ${doc.name}${doc.company ? ' — ' + doc.company : ''}`,
        html,
        text,
      }),
    });
    if (!res.ok) console.error('Enquiry email failed', res.status, await res.text());
  } catch (err) {
    console.error('Enquiry email failed', err);
  }
}

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
  try {
    const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });
    await client.create(doc);
    await notify(doc, new URL(req.url).origin);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Enquiry save failed', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
