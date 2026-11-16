'use client';

import { useEffect, useState } from 'react';
import { useClient } from 'sanity';
import { LogoMark } from './DashIcons';

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

  if (!url) return <LogoMark />;
  return (
    <img
      src={url.toLowerCase().endsWith('.svg') ? url : `${url}?h=160&fit=max&q=100`}
      alt=""
      style={{ width: '1em', height: '1em', objectFit: 'contain', borderRadius: '0.26em', display: 'block' }}
    />
  );
}
