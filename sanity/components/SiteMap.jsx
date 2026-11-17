'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useClient, useSchema } from 'sanity';
import { usePaneRouter } from 'sanity/structure';
import { SITE_PAGES } from '../sitePages';
import { countFields } from './FormChrome';

/**
 * Website setup: your pages as a visual map. Click a page to open its editor beside the map.
 * Wide: a grid of page cards with a little picture of each page and how much of it is filled in.
 * Narrow (an editor is open next to it): a tidy list of the same pages.
 * Styles: app/studio/studio.css (".lo-site…").
 */

const DOC_IDS = SITE_PAGES.filter((p) => !p.list).map((p) => p.id);
const DRAFT_IDS = DOC_IDS.map((id) => `drafts.${id}`);
const QUERY = `{
  "docs": *[_id in $ids || _id in $drafts],
  "steps": *[_type == "processStep"]{ _id, title, order }
}`;
const LISTEN = '*[_id in $ids || _id in $drafts || _type == "processStep"]';

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M2 7h10M8 3l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ArrowUpRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M4 10 10 4M5.2 4H10v4.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* A tiny drawing of each page's layout */
function Wire({ shape }) {
  const b = (cls) => <span className={`w ${cls}`} />;
  let body = null;
  switch (shape) {
    case 'home':
      body = (
        <>
          <span className="w-col">{b('t')}{b('t blue')}{b('l')}{b('btn')}</span>
          <span className="w-hero"><span className="w-dot" /></span>
          <span className="w-row3">{b('card')}{b('card')}{b('card')}</span>
        </>
      );
      break;
    case 'services':
      body = <span className="w-stack">{b('panel')}{b('panel blue')}{b('panel ink')}</span>;
      break;
    case 'about':
      body = (
        <>
          <span className="w-img" />
          <span className="w-col">{b('t')}{b('l')}{b('l')}{b('l short')}</span>
          <span className="w-row3">{b('pill')}{b('pill')}{b('pill')}</span>
        </>
      );
      break;
    case 'process':
      body = (
        <>
          <span className="w-col wide">{b('t')}{b('t blue')}</span>
          <span className="w-row3">{b('num')}{b('num')}{b('num')}</span>
        </>
      );
      break;
    case 'steps':
      body = (
        <span className="w-steps">
          {[1, 2, 3].map((n) => (
            <span key={n} className="w-step">
              <span className="w-badge">{`0${n}`}</span>
              {b('l')}
            </span>
          ))}
        </span>
      );
      break;
    case 'work':
      body = (
        <>
          <span className="w-pills">{b('chip blue')}{b('chip')}{b('chip')}</span>
          <span className="w-grid">{b('thumb')}{b('thumb')}{b('thumb')}{b('thumb')}{b('thumb')}{b('thumb')}</span>
        </>
      );
      break;
    case 'contact':
      body = (
        <>
          <span className="w-col">{b('t')}{b('t blue')}{b('l')}{b('l short')}</span>
          <span className="w-form">{b('field')}{b('field')}{b('field tall')}{b('btn')}</span>
        </>
      );
      break;
    case 'brand':
      body = (
        <>
          <span className="w-head"><span className="w-logo" />{b('nav')}{b('nav')}{b('nav')}{b('btn')}</span>
          <span className="w-band" />
          <span className="w-foot">{b('l')}{b('l short')}</span>
        </>
      );
      break;
    default:
      body = null;
  }
  return (
    <span className="lo-wire" data-shape={shape} aria-hidden="true">
      <span className="lo-wire-bar"><i /><i /><i /></span>
      <span className="lo-wire-body">{body}</span>
    </span>
  );
}

function Meter({ filled, total }) {
  if (!total) return null;
  const done = filled === total;
  return (
    <span className="lo-meter" data-done={done ? '' : undefined}>
      <span className="lo-meter-track">
        <span className="lo-meter-fill" style={{ transform: `scaleX(${filled / total})` }} />
      </span>
      <span className="lo-meter-label">{done ? 'All filled' : `${filled} of ${total} filled`}</span>
    </span>
  );
}

export function SiteMap(props) {
  const { childItemId } = props;
  const { ChildLink } = usePaneRouter();
  const client = useClient({ apiVersion: '2024-10-01' });
  const schema = useSchema();
  const [data, setData] = useState(null);
  const [wide, setWide] = useState(true);
  const rootRef = useRef(null);

  /* load the pages, and keep the map up to date as you edit */
  useEffect(() => {
    let alive = true;
    let timer = null;
    const params = { ids: DOC_IDS, drafts: DRAFT_IDS };
    const load = () =>
      client
        .fetch(QUERY, params)
        .then((res) => alive && setData(res || { docs: [], steps: [] }))
        .catch(() => alive && setData({ docs: [], steps: [] }));
    load();
    let sub = null;
    try {
      sub = client.listen(LISTEN, params, { visibility: 'query' }).subscribe({
        next: () => {
          clearTimeout(timer);
          timer = setTimeout(load, 700);
        },
        error: () => {},
      });
    } catch {
      sub = null;
    }
    return () => {
      alive = false;
      clearTimeout(timer);
      if (sub) sub.unsubscribe();
    };
  }, [client]);

  /* grid when there's room */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0] && entries[0].contentRect.width;
      if (w) setWide(w >= 600);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stats = useMemo(() => {
    const out = {};
    const docs = (data && data.docs) || [];
    DOC_IDS.forEach((id) => {
      const doc = docs.find((d) => d._id === `drafts.${id}`) || docs.find((d) => d._id === id) || {};
      const type = schema && typeof schema.get === 'function' ? schema.get(id) : null;
      out[id] = type ? countFields(type, doc) : { filled: 0, total: 0 };
    });
    const seen = new Set();
    const steps = ((data && data.steps) || []).filter((s) => {
      const base = s._id.replace(/^drafts\./, '');
      if (seen.has(base)) return false;
      seen.add(base);
      return true;
    });
    out.processStep = { steps: steps.length };
    return out;
  }, [data, schema]);

  const pagesDone = DOC_IDS.filter((id) => stats[id] && stats[id].total && stats[id].filled === stats[id].total).length;
  const host = typeof window !== 'undefined' ? window.location.host : '';

  const meta = (p) => {
    if (p.list) {
      const n = stats.processStep ? stats.processStep.steps : 0;
      return <span className="lo-meter-label">{n === 1 ? '1 step' : `${n} steps`}</span>;
    }
    const st = stats[p.id];
    return st ? <Meter filled={st.filled} total={st.total} /> : null;
  };

  /* a page is open beside the map (or it's narrow): show the slim list */
  if (!wide || childItemId) {
    return (
      <div className="lo-site" data-mode="list" data-open={childItemId ? '' : undefined} ref={rootRef}>
        <nav className="lo-site-list" aria-label="Website pages">
          {SITE_PAGES.map((p, i) => (
            <ChildLink key={p.id} childId={p.id} className="lo-site-row" data-active={childItemId === p.id ? '' : undefined} style={{ '--i': i }}>
              <span className="lo-site-mini">
                <Wire shape={p.shape} />
              </span>
              <span className="lo-site-rowtext">
                <span className="lo-site-rowtitle">{p.title}</span>
                {data ? meta(p) : <span className="lo-meter-label">&nbsp;</span>}
              </span>
            </ChildLink>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="lo-site" data-mode="grid" ref={rootRef}>
      <header className="lo-site-hero">
        <span className="lo-hero-rings" aria-hidden="true" />
        <div className="lo-hero-row">
          <span className="lo-eyebrow">
            <span className="lo-eyebrow-dot" aria-hidden="true" />
            Website setup
          </span>
          <a className="lo-live" href="/" target="_blank" rel="noopener noreferrer">
            View your website
            <ArrowUpRight />
          </a>
        </div>
        <h1 className="lo-site-title">Your website, page by page.</h1>
        <p className="lo-site-text">
          Set these up once and you’re done. Day to day you’ll mostly use Updates. Pick a page to edit it; changes go live when you
          press Publish.
        </p>
        {data ? (
          <p className="lo-site-sum">
            <b>{pagesDone}</b> of {DOC_IDS.length} pages fully filled in
          </p>
        ) : null}
      </header>

      <div className="lo-site-grid">
        {SITE_PAGES.map((p, i) => (
          <ChildLink key={p.id} childId={p.id} className="lo-page" data-active={childItemId === p.id ? '' : undefined} style={{ '--i': i }}>
            <span className="lo-page-shot">
              <Wire shape={p.shape} />
            </span>
            <span className="lo-page-body">
              <span className="lo-page-title">{p.title}</span>
              <span className="lo-page-path">
                {host}
                {p.path === '/' ? '' : p.path}
              </span>
              <span className="lo-page-text">{p.text}</span>
              <span className="lo-page-foot">
                {data ? meta(p) : <span className="lo-meter-label">&nbsp;</span>}
                <span className="lo-page-cta">
                  {p.list ? 'Open' : 'Edit'}
                  <Arrow />
                </span>
              </span>
            </span>
          </ChildLink>
        ))}
      </div>
    </div>
  );
}
