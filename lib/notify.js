import { callLabel } from '@/lib/calls';

const esc = (v) => String(v || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* Emails you about each new enquiry (via Resend). Never blocks the enquiry from saving. */
export async function notify(doc, origin) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: 'RESEND_API_KEY is not set on this deployment' };
  const to = process.env.NOTIFY_EMAIL || 'contact@louisoliver.co.uk';
  const from = process.env.NOTIFY_FROM || 'Louis Oliver Website <onboarding@resend.dev>';
  const site = (process.env.SITE_URL || origin || '').replace(/\/$/, '');
  const dashboard = `${site}/studio`;
  const call = callLabel(doc.call);
  const rows = [
    ['Call', call ? `${call} (UK time)` : ''],
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
        ${call ? `<div style="display:inline-block;margin-top:14px;padding:9px 14px;border-radius:999px;background:#ffffff;color:#104de6;font-size:14px;font-weight:600">Call booked: ${esc(call)} (UK time)</div>` : ''}
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
        subject: `New enquiry from ${doc.name}${doc.company ? ` at ${doc.company}` : ''}${call ? `, call booked ${call}` : ''}`,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('Enquiry email failed', res.status, body);
      return { ok: false, reason: `Resend said ${res.status}: ${body.slice(0, 300)}`, from, to };
    }
    return { ok: true, from, to };
  } catch (err) {
    console.error('Enquiry email failed', err);
    return { ok: false, reason: String(err && err.message ? err.message : err), from, to };
  }
}

