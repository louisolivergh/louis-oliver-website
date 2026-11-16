'use client';

import { useEffect, useState } from 'react';

export default function SetupCheckClient({ projectId, dataset, hasToken }) {
  const [origin, setOrigin] = useState('');
  const [cors, setCors] = useState('checking…');

  useEffect(() => {
    setOrigin(window.location.origin);
    if (!projectId) { setCors('No Project ID set'); return; }
    fetch(`https://${projectId}.api.sanity.io/v2024-10-01/users/me`, { credentials: 'include' })
      .then((r) => setCors(r.ok ? 'Allowed ✓ (this address is on the CORS list with credentials)' : `Reached Sanity (status ${r.status})`))
      .catch(() => setCors('Blocked ✗ — this exact address is not on the CORS list for this project, or “Allow credentials” is not ticked'));
  }, [projectId]);

  const rows = [
    ['Project ID the site is using', projectId || '— missing —'],
    ['Dataset', dataset],
    ['This page’s address (add exactly this to CORS)', origin],
    ['CORS test', cors],
    ['Contact-form token set', hasToken ? 'Yes ✓' : 'No'],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--line)', borderRadius: 20, overflow: 'hidden' }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 16, padding: '16px 20px', borderTop: '1px solid var(--line)' }}>
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>{k}</span>
          <span style={{ fontWeight: 600, fontSize: 15, wordBreak: 'break-all' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}
