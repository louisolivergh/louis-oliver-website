'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useClient } from 'sanity';
import { IntentLink, useRouter, useRouterState } from 'sanity/router';
import { EQUIPMENT_CATEGORIES } from '../categories';
import { CameraIcon, InboxIcon, KitIcon } from './DashIcons';

/**
 * Fills the empty space beside the lists in Updates with something useful:
 *  - nothing open → three cards (shoots, equipment, enquiries) and quick actions
 *  - Shoots open → your shoots as a gallery
 *  - Equipment open → your kit, grouped
 *  - Enquiries open → your inbox at a glance
 * It sits after the open lists and disappears as soon as an editor opens (see app/studio/studio.css, ".lo-canvas").
 */

const EMPTY = [];
const QUERY = `{
  "shoots": *[_type == "shoot"]{ _id, title, client, category, featured, date, "thumb": thumbnail.asset->url },
  "kit": *[_type == "equipment"]{ _id, name, spec, category },
  "enquiries": *[_type == "enquiry"] | order(receivedAt desc)[0...60]{ _id, name, company, service, budget, receivedAt, replied }
}`;
const LISTEN = '*[_type in ["shoot", "equipment", "enquiry"]]';

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M2 7h10M8 3l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Plus = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M7 2.5v9M2.5 7h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/* one entry per document — the draft if you're mid-edit, otherwise the published version */
function latest(list) {
  const map = new Map();
  (list || []).forEach((d) => {
    const base = d._id.replace(/^drafts\./, '');
    const isDraft = d._id.startsWith('drafts.');
    const prev = map.get(base) || {};
    map.set(base, { ...prev, ...(isDraft ? { draft: d } : { published: d }) });
  });
  return [...map.entries()].map(([id, v]) => ({ ...(v.draft || v.published), _id: id, unpublished: !v.published }));
}

const when = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');

function useStudioPath() {
  const router = useRouter();
  const base = typeof window !== 'undefined' && window.location.pathname.startsWith('/studio') ? '/studio' : '';
  return (path) => ({
    href: `${base}${path}`,
    onClick: (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
      e.preventDefault();
      router.navigateUrl({ path: `${base}${path}` });
    },
  });
}

/* ---------- the panel itself ---------- */

function Canvas({ view }) {
  const client = useClient({ apiVersion: '2024-10-01' });
  const link = useStudioPath();
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    let timer = null;
    const load = () =>
      client
        .fetch(QUERY)
        .then((res) => alive && setData(res || {}))
        .catch(() => alive && setData({}));
    load();
    let sub = null;
    try {
      sub = client.listen(LISTEN, {}, { visibility: 'query' }).subscribe({
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

  const shoots = useMemo(
    () => latest(data && data.shoots).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))),
    [data]
  );
  const kit = useMemo(() => latest(data && data.kit), [data]);
  const enquiries = useMemo(
    () => latest(data && data.enquiries).sort((a, b) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || ''))),
    [data]
  );
  const toReply = enquiries.filter((e) => !e.replied);
  const featured = shoots.filter((s) => s.featured).length;
  const groups = EQUIPMENT_CATEGORIES.map((c) => ({ ...c, items: kit.filter((k) => k.category === c.value) })).filter((g) => g.items.length);
  const other = kit.filter((k) => !EQUIPMENT_CATEGORIES.some((c) => c.value === k.category));
  if (other.length) groups.push({ value: 'other', title: 'Other', items: other });

  const loading = !data;

  /* ----- Shoots open: a gallery ----- */
  if (view === 'shoots') {
    return (
      <div className="lo-cv" key="shoots">
        <header className="lo-cv-hero">
          <span className="lo-eyebrow"><span className="lo-eyebrow-dot" aria-hidden="true" />Shoots &amp; portfolio</span>
          <div className="lo-cv-headrow">
            <h1 className="lo-cv-title">Your shoots</h1>
            <IntentLink intent="create" params={{ type: 'shoot' }} className="lo-cv-btn" data-primary="">
              <Plus /> New shoot
            </IntentLink>
          </div>
          <p className="lo-cv-text">Pick one to edit it, or start a new one. Newest first — the same order as your Work page.</p>
        </header>
        {loading ? null : shoots.length ? (
          <div className="lo-cv-gallery">
            {shoots.map((s, i) => (
              <IntentLink key={s._id} intent="edit" params={{ id: s._id, type: 'shoot' }} className="lo-cv-shot" style={{ '--i': i }}>
                <span className="lo-cv-shot-img">
                  {s.thumb ? <img src={`${s.thumb}?w=640&h=480&fit=crop&auto=format`} alt="" loading="lazy" /> : <span className="lo-cv-shot-empty"><CameraIcon /></span>}
                  <span className="lo-cv-badges">
                    {s.featured ? <span className="lo-cv-badge">★ Featured</span> : null}
                    {s.unpublished ? <span className="lo-cv-badge" data-muted="">Not published yet</span> : null}
                  </span>
                </span>
                <span className="lo-cv-shot-title">{s.title || 'Untitled client'}</span>
                <span className="lo-cv-shot-meta">{[s.client, s.category].filter(Boolean).join(' · ') || 'Add a location and category'}</span>
              </IntentLink>
            ))}
          </div>
        ) : (
          <div className="lo-cv-empty">
            <span className="lo-cv-ic"><CameraIcon /></span>
            <p>No shoots yet. Your first one will appear here — and on your Work page once it’s published.</p>
            <IntentLink intent="create" params={{ type: 'shoot' }} className="lo-cv-btn" data-primary="">
              <Plus /> Add your first shoot
            </IntentLink>
          </div>
        )}
      </div>
    );
  }

  /* ----- Equipment open: your kit, grouped ----- */
  if (view === 'kit') {
    return (
      <div className="lo-cv" key="kit">
        <header className="lo-cv-hero">
          <span className="lo-eyebrow"><span className="lo-eyebrow-dot" aria-hidden="true" />Equipment list</span>
          <div className="lo-cv-headrow">
            <h1 className="lo-cv-title">Your kit</h1>
            <IntentLink intent="create" params={{ type: 'equipment' }} className="lo-cv-btn" data-primary="">
              <Plus /> Add equipment
            </IntentLink>
          </div>
          <p className="lo-cv-text">Everything here shows on your About page, and can be ticked on any shoot.</p>
        </header>
        {loading ? null : groups.length ? (
          <div className="lo-cv-kit">
            {groups.map((g, i) => (
              <section key={g.value} className="lo-cv-kitgroup" style={{ '--i': i }}>
                <span className="lo-cv-kitlabel">{g.title}<span>{g.items.length}</span></span>
                <div className="lo-cv-chips">
                  {g.items.map((k) => (
                    <IntentLink key={k._id} intent="edit" params={{ id: k._id, type: 'equipment' }} className="lo-cv-chip">
                      {k.name || 'Untitled'}
                      {k.spec ? <span>· {k.spec}</span> : null}
                    </IntentLink>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="lo-cv-empty">
            <span className="lo-cv-ic"><KitIcon /></span>
            <p>Your kit list is empty. Add your cameras, lenses and lights — then tick them on each shoot.</p>
            <IntentLink intent="create" params={{ type: 'equipment' }} className="lo-cv-btn" data-primary="">
              <Plus /> Add your first item
            </IntentLink>
          </div>
        )}
      </div>
    );
  }

  /* ----- Enquiries open: the inbox at a glance ----- */
  if (view === 'inbox') {
    return (
      <div className="lo-cv" key="inbox">
        <header className="lo-cv-hero">
          <span className="lo-eyebrow"><span className="lo-eyebrow-dot" aria-hidden="true" />Inbox</span>
          <h1 className="lo-cv-title">
            {loading ? 'Enquiries' : toReply.length ? `${toReply.length} waiting for a reply` : 'All caught up'}
          </h1>
          <p className="lo-cv-text">New enquiries from your contact form land here, and in your email.</p>
        </header>
        {loading ? null : enquiries.length ? (
          <div className="lo-cv-inbox">
            {enquiries.slice(0, 10).map((e, i) => (
              <IntentLink key={e._id} intent="edit" params={{ id: e._id, type: 'enquiry' }} className="lo-cv-mail" data-done={e.replied ? '' : undefined} style={{ '--i': i }}>
                <span className="lo-cv-mail-dot" aria-hidden="true" />
                <span className="lo-cv-mail-main">
                  <span className="lo-cv-mail-name">{[e.name, e.company].filter(Boolean).join(' — ') || 'Enquiry'}</span>
                  <span className="lo-cv-mail-meta">{[e.service, e.budget].filter(Boolean).join(' · ') || 'No details'}</span>
                </span>
                <span className="lo-cv-mail-side">
                  <span className="lo-cv-pill">{e.replied ? 'Replied' : 'To reply'}</span>
                  <span className="lo-cv-mail-when">{when(e.receivedAt)}</span>
                </span>
              </IntentLink>
            ))}
          </div>
        ) : (
          <div className="lo-cv-empty">
            <span className="lo-cv-ic"><InboxIcon /></span>
            <p>No enquiries yet. When someone fills in your contact form, it appears here and you get an email.</p>
          </div>
        )}
      </div>
    );
  }

  /* ----- nothing open yet: the three areas ----- */
  const latestEnquiry = enquiries[0];
  return (
    <div className="lo-cv" key="home">
      <header className="lo-cv-hero">
        <span className="lo-eyebrow"><span className="lo-eyebrow-dot" aria-hidden="true" />Updates</span>
        <h1 className="lo-cv-title">Keep your portfolio fresh.</h1>
        <p className="lo-cv-text">Add new shoots, keep your kit list current and reply to enquiries — everything you’ll come back to.</p>
      </header>

      <div className="lo-cv-cards">
        <a className="lo-cv-card" {...link('/updates/shoot')} style={{ '--i': 0 }}>
          <span className="lo-cv-card-top">
            <span className="lo-cv-ic"><CameraIcon /></span>
            <span className="lo-cv-count">{loading ? '–' : shoots.length}</span>
          </span>
          <span className="lo-cv-card-title">Shoots &amp; portfolio</span>
          <span className="lo-cv-card-text">{loading ? ' ' : shoots.length ? `${featured} featured on your homepage` : 'No shoots yet'}</span>
          <span className="lo-cv-strip">
            {shoots.filter((s) => s.thumb).slice(0, 4).map((s) => (
              <img key={s._id} src={`${s.thumb}?w=160&h=120&fit=crop&auto=format`} alt="" loading="lazy" />
            ))}
          </span>
          <span className="lo-cv-card-cta">Open shoots <Arrow /></span>
        </a>

        <a className="lo-cv-card" {...link('/updates/equipment')} style={{ '--i': 1 }}>
          <span className="lo-cv-card-top">
            <span className="lo-cv-ic"><KitIcon /></span>
            <span className="lo-cv-count">{loading ? '–' : kit.length}</span>
          </span>
          <span className="lo-cv-card-title">Equipment list</span>
          <span className="lo-cv-card-text">{loading ? ' ' : groups.length ? groups.map((g) => g.title).join(' · ') : 'Nothing added yet'}</span>
          <span className="lo-cv-card-cta">Open kit list <Arrow /></span>
        </a>

        <a className="lo-cv-card" data-accent={toReply.length ? '' : undefined} {...link('/updates/enquiries')} style={{ '--i': 2 }}>
          <span className="lo-cv-card-top">
            <span className="lo-cv-ic"><InboxIcon /></span>
            <span className="lo-cv-count">{loading ? '–' : toReply.length}</span>
          </span>
          <span className="lo-cv-card-title">{toReply.length === 1 ? 'Enquiry to reply to' : 'Enquiries to reply to'}</span>
          <span className="lo-cv-card-text">
            {loading ? ' ' : latestEnquiry ? `Latest: ${[latestEnquiry.name, latestEnquiry.company].filter(Boolean).join(' — ') || 'Enquiry'}` : 'None yet'}
          </span>
          <span className="lo-cv-card-cta">Open inbox <Arrow /></span>
        </a>
      </div>

      <div className="lo-cv-actions">
        <IntentLink intent="create" params={{ type: 'shoot' }} className="lo-cv-btn" data-primary="">
          <Plus /> New shoot
        </IntentLink>
        <IntentLink intent="create" params={{ type: 'equipment' }} className="lo-cv-btn">
          <Plus /> Add equipment
        </IntentLink>
      </div>
    </div>
  );
}

/* ---------- putting it in place ---------- */

/* Finds the column area of Updates and gives the panel a spot at its end. */
function usePaneLayoutHost(enabled) {
  const [host, setHost] = useState(null);
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      setHost(null);
      return undefined;
    }
    const el = document.createElement('div');
    el.className = 'lo-canvas';
    let frame = 0;
    const place = () => {
      frame = 0;
      const layout = document.querySelector('[data-ui="PaneLayout"]');
      if (!layout) {
        if (el.parentNode) el.parentNode.removeChild(el);
        setHost(null);
        return;
      }
      if (el.parentNode !== layout) layout.appendChild(el);
      setHost(el);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    place();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      if (el.parentNode) el.parentNode.removeChild(el);
      setHost(null);
    };
  }, [enabled]);
  return host;
}

function CanvasHost() {
  const tool = useRouterState((s) => (s && typeof s.tool === 'string' ? s.tool : ''));
  const panes = useRouterState((s) => (s && s.tool && s[s.tool] && Array.isArray(s[s.tool].panes) ? s[s.tool].panes : EMPTY));
  const host = usePaneLayoutHost(tool === 'updates');
  if (!host) return null;
  const first = panes[0] && panes[0][0] ? panes[0][0].id : '';
  const view = first === 'shoot' ? 'shoots' : first === 'equipment' ? 'kit' : first === 'enquiries' ? 'inbox' : 'home';
  return createPortal(<Canvas view={view} />, host);
}

/* Studio layout: Sanity's own, plus the panel above */
export function StudioLayout(props) {
  return (
    <>
      {props.renderDefault(props)}
      <CanvasHost />
    </>
  );
}
