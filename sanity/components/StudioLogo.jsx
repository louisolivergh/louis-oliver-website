'use client';

import { useEffect, useState } from 'react';
import { useClient } from 'sanity';

let cached; // remember the logo between renders so it doesn't flicker

/** Dashboard icon: "Dashboard logo" from Logo & footer, else the site logo, else the LO mark. */
export function StudioLogo() {
  const client = useClient({ apiVersion: '2024-10-01' });
  const [url, setUrl] = useState(cached);

  useEffect(() => {
    let alive = true;
    const load = () =>
      client
        .fetch('*[_id == "siteSettings"][0]{ "u": coalesce(dashboardLogo.asset->url, logo.asset->url) }.u')
        .then((u) => { cached = u || null; if (alive) setUrl(cached); })
        .catch(() => {});
    load();
    const sub = client.listen('*[_id == "siteSettings"]').subscribe({ next: () => setTimeout(load, 800), error: () => {} });
    return () => { alive = false; sub.unsubscribe(); };
  }, [client]);

  /* The dashboard draws this icon in a small, top-aligned slot: scale it up and nudge it down so it
     sits larger and centred beside the title without changing the toolbar's layout. */
  const boost = { display: 'block', transform: 'translate(30%, 26%) scale(1.3)', transformOrigin: 'center' };
  if (!url) return <img src="/favicon-192.png" alt="" style={{ ...boost, width: '1em', height: '1em' }} />;
  return (
    <img
      src={url.toLowerCase().endsWith('.svg') ? url : `${url}?h=200&fit=max&q=100`}
      alt=""
      style={{ ...boost, width: '1em', height: '1em', objectFit: 'contain', borderRadius: '0.26em' }}
    />
  );
}

/**
 * Full brand block in the dashboard's top-left: your logo at a proper size,
 * vertically centred with the "Louis Oliver" title.
 */
export function StudioBrand(props) {
  const title = (props && props.title) || 'Louis Oliver';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height: '100%', padding: '0 4px', lineHeight: 1 }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, fontSize: 22, flex: 'none' }}>
        <StudioLogo />
      </span>
      <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{title}</span>
    </span>
  );
}
