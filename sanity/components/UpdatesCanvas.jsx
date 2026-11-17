'use client';

import { useEffect, useMemo, useState } from 'react';
import { useClient } from 'sanity';
import { IntentLink } from 'sanity/router';
import { EQUIPMENT_CATEGORIES } from '../categories';
import { CameraIcon, InboxIcon, KitIcon, PhoneIcon } from './DashIcons';
import { fmtDay, tidyRange, todayYmd } from '../bookingData';

/**
 * The pages of the Updates tab (beside the menu in UpdatesHome.jsx):
 *  - Portfolio → your portfolio shoots as a gallery
 *  - Equipment list → your kit, grouped
 *  - Enquiries → your inbox at a glance
 * Picking anything opens it in place of the page. Styles: app/studio/studio.css (".lo-cv…", ".lo-upsec").
 */

const QUERY = `{
  "shoots": *[_type == "shoot"]{ _id, title, client, category, featured, date, "thumb": thumbnail.asset->url },
  "kit": *[_type == "equipment"]{ _id, name, spec, category },
  "enquiries": *[_type == "enquiry"] | order(receivedAt desc)[0...60]{ _id, name, company, service, budget, receivedAt, replied, "call": call{ date, time } }
}`;
const LISTEN = '*[_type in ["shoot", "equipment", "enquiry"]]';

const Plus = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M7 2.5v9M2.5 7h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/* one entry per document, the draft if you're mid-edit, otherwise the published version */
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


/* ---------- the numbers behind Updates (also used by UpdatesHome.jsx) ---------- */

export function useUpdatesData() {
  const client = useClient({ apiVersion: '2024-10-01' });
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
  return { shoots, kit, enquiries, toReply, featured, groups, loading: !data };
}

/* ---------- the panel itself ---------- */

function Canvas({ view }) {
  const { shoots, kit, enquiries, toReply, featured, groups, loading } = useUpdatesData();

  /* ----- Shoots open: a gallery ----- */
  if (view === 'shoots') {
    return (
      <div className="lo-cv" key="shoots">
        <header className="lo-cv-hero">
          <span className="lo-eyebrow"><span className="lo-eyebrow-dot" aria-hidden="true" />Portfolio</span>
          <div className="lo-cv-headrow">
            <h1 className="lo-cv-title">Your portfolio</h1>
            <IntentLink intent="create" params={{ type: 'shoot', template: 'shoot' }} className="lo-cv-btn" data-primary="">
              <Plus /> Add a shoot
            </IntentLink>
          </div>
          <p className="lo-cv-text">Pick one to edit it, or start a new one. Newest first, the same order as your Work page.</p>
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
            <p>Nothing in your portfolio yet. Your first shoot will appear here, and on your Work page once it’s published.</p>
            <IntentLink intent="create" params={{ type: 'shoot', template: 'shoot' }} className="lo-cv-btn" data-primary="">
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
            <IntentLink intent="create" params={{ type: 'equipment', template: 'equipment' }} className="lo-cv-btn" data-primary="">
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
            <p>Your kit list is empty. Add your cameras, lenses and lights, then tick them on each shoot.</p>
            <IntentLink intent="create" params={{ type: 'equipment', template: 'equipment' }} className="lo-cv-btn" data-primary="">
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
                  <span className="lo-cv-mail-name">{[e.name, e.company].filter(Boolean).join(' · ') || 'Enquiry'}</span>
                  <span className="lo-cv-mail-meta">{[e.service, tidyRange(e.budget)].filter(Boolean).join(' · ') || 'No details'}</span>
                  {e.call && e.call.date && e.call.time && e.call.date >= todayYmd() ? (
                    <span className="lo-enq-call">
                      <PhoneIcon /> Call {e.call.date === todayYmd() ? 'today' : fmtDay(e.call.date, { weekday: 'short', day: 'numeric', month: 'short' })}, {e.call.time}
                    </span>
                  ) : null}
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

  /* nothing open: the Updates pane itself is the page (UpdatesHome.jsx) */
  return null;
}

/* ---------- the three areas, each as its own page beside the menu (sanity/structure.js) ---------- */

const Area = ({ view }) => (
  <div className="lo-upsec">
    <Canvas view={view} />
  </div>
);
export const PortfolioPane = () => <Area view="shoots" />;
export const KitPane = () => <Area view="kit" />;
export const InboxPane = () => <Area view="inbox" />;

/* Studio layout: Sanity's own (kept so sanity.config.js stays the same) */
export function StudioLayout(props) {
  return props.renderDefault(props);
}
