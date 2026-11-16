'use client';

import { useEffect, useRef, useState } from 'react';
import { useClient } from 'sanity';

let cached; // remember the logo between renders so it doesn't flicker

/** Dashboard icon: "Dashboard logo" from Logo & footer, else the site logo, else the LO mark. */
export function StudioLogo() {
  const client = useClient({ apiVersion: '2024-10-01' });
  const [url, setUrl] = useState(cached);
  const ref = useRef(null);

  /* The dashboard puts this icon in a small box that crops anything bigger.
     Let the few boxes around it show overflow so the larger logo is never cut off. */
  useEffect(() => {
    let el = ref.current && ref.current.parentElement;
    for (let i = 0; el && i < 4; i += 1, el = el.parentElement) {
      const cs = window.getComputedStyle(el);
      if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        el.style.overflow = 'visible';
      }
      if (cs.contain && cs.contain !== 'none') el.style.contain = 'none';
    }
  });

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

  /* Drawn at its real size (not scaled up afterwards, which blurs it) but with negative margins,
     so it looks larger yet takes the same space — the title text never moves. */
  const style = {
    display: 'block',
    width: '1.65em',
    height: '1.65em',
    margin: '-0.325em',
    position: 'relative',
    left: '0.395em',
    top: '0.26em',
    maxWidth: 'none',
    objectFit: 'contain',
    borderRadius: '0.43em',
    imageRendering: 'auto',
  };
  const src = !url
    ? '/favicon-512.png'
    : url.toLowerCase().endsWith('.svg')
      ? url
      : `${url}?h=256&fit=max&q=100`;
  return <img ref={ref} src={src} alt="" decoding="async" style={style} />;
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
