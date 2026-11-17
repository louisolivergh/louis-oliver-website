'use client';

import { useEffect, useState } from 'react';

export default function SetupCheckClient({ projectId, problem, dataset, hasToken, email }) {
  const [origin, setOrigin] = useState('');
  const [cors, setCors] = useState('checking…');
  const [test, setTest] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    if (!projectId) { setCors('No Project ID set'); return; }
    fetch(`https://${projectId}.api.sanity.io/v2024-10-01/users/me`, { credentials: 'include' })
      .then((r) => setCors(r.ok ? 'Allowed ✓ (this address is on the CORS list with credentials)' : `Reached Sanity (status ${r.status})`))
      .catch(() => setCors('Blocked ✗. This exact address is not on the CORS list for this project, or “Allow credentials” is not ticked'));
  }, [projectId]);

  const rows = [
    ['Project ID the site is using', projectId || (problem === 'invalid' ? '✗ The value in Vercel is not a valid Project ID. Paste just the short code (letters and numbers only)' : 'Missing')],
    ['Project ID note', problem === 'cleaned' ? 'The value in Vercel had extra spaces or capitals. Fixed automatically, but worth re-pasting cleanly' : problem ? 'Needs fixing in Vercel' : 'Looks good ✓'],
    ['Dataset', dataset],
    ['This page’s address (add exactly this to CORS)', origin],
    ['CORS test', cors],
    ['Contact-form token set (needed for enquiries to save)', hasToken ? 'Yes ✓' : 'No ✗. Add SANITY_API_WRITE_TOKEN'],
    ['Resend key set', email.hasKey ? 'Yes ✓' : 'No ✗. Add RESEND_API_KEY, then redeploy'],
    ['Emails go to', email.to],
    ['Emails come from', email.from],
    ['Dashboard link in emails', email.site],
  ];
  const sendTest = async () => {
    setTest('Sending…');
    try {
      const r = await fetch('/api/test-email', { method: 'POST' });
      const j = await r.json();
      setTest(j.ok ? `Sent ✓. Check ${j.to} (and junk). It should also appear in Resend → Emails.` : `Not sent ✗: ${j.reason}`);
    } catch (e) {
      setTest('Not sent ✗. The test could not reach the website.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--line)', borderRadius: 20, overflow: 'hidden' }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 16, padding: '16px 20px', borderTop: '1px solid var(--line)' }}>
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>{k}</span>
          <span style={{ fontWeight: 600, fontSize: 15, wordBreak: 'break-all' }}>{v}</span>
        </div>
      ))}
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
      <button type="button" className="btn btn-primary btn-sm" onClick={sendTest}>Send a test enquiry email</button>
      {test ? <span style={{ fontWeight: 600, fontSize: 15 }}>{test}</span> : null}
    </div>
    </div>
  );
}
