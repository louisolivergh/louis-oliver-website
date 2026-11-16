'use client';

import { useCallback, useEffect, useState } from 'react';
import { useClient } from 'sanity';
import { IntentLink } from 'sanity/router';
import {
  CameraIcon,
  CheckIcon,
  EyeIcon,
  HomeIcon,
  InboxIcon,
  KitIcon,
  MailIcon,
  PageIcon,
  PhotoIcon,
  PlayIcon,
  SettingsIcon,
  StarIcon,
  StepsIcon,
} from './DashIcons';

/* Name shown in the greeting */
const OWNER_NAME = 'Louis Jones';

const BLUE = '#104de6';
const INK = '#0b1220';
const MUTED = '#5b6475';
const LINE = '#e6eaf1';
const SOFT = '#f4f7fd';
const TINT = '#eef3fe';
const DISPLAY = 'var(--font-sora), Inter, system-ui, sans-serif';
const BODY = 'var(--font-inter), Inter, system-ui, sans-serif';

const PUB = '!(_id in path("drafts.**"))';
const QUERY = `{
  "shoots": count(*[_type == "shoot" && ${PUB}]),
  "featured": count(*[_type == "shoot" && featured == true && ${PUB}]),
  "unpublished": count(*[_type == "shoot" && _id in path("drafts.**")]),
  "photos": count(*[_type == "shoot" && ${PUB}].sections[_type == "gallery"].images[]) + count(*[_type == "shoot" && ${PUB}].sections[_type == "fullPhoto"]),
  "videos": count(*[_type == "shoot" && ${PUB}].sections[_type in ["featureVideo", "fullVideo"]]) + count(*[_type == "shoot" && ${PUB}].sections[_type == "videoGrid"].videos[]),
  "equipment": count(*[_type == "equipment" && ${PUB}]),
  "enquiries": count(*[_type == "enquiry" && ${PUB}]),
  "newEnquiries": count(*[_type == "enquiry" && ${PUB} && replied != true]),
  "latest": *[_type == "enquiry" && ${PUB}] | order(receivedAt desc)[0...8]{ _id, name, company, email, phone, service, budget, details, receivedAt, replied },
  "recent": *[_type == "shoot" && ${PUB}] | order(_updatedAt desc)[0...5]{ _id, title, client, category, featured, "thumb": thumbnail.asset->url }
}`;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function ago(date) {
  if (!date) return '';
  const s = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const card = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 24, padding: 24 };
const h2 = { margin: 0, fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: INK };
const eyebrow = { fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: BLUE };

function Stat({ icon: I, label, value, sub, accent, href, onClick }) {
  const style = {
    ...card,
    padding: '20px 22px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    background: accent ? BLUE : '#fff',
    borderColor: accent ? BLUE : LINE,
    color: accent ? '#fff' : INK,
    textDecoration: 'none',
    cursor: href || onClick ? 'pointer' : 'default',
    textAlign: 'left',
    font: 'inherit',
    width: '100%',
    transition: 'transform .3s ease, box-shadow .3s ease, border-color .3s ease',
  };
  const inner = (
    <>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: accent ? 'rgba(255,255,255,0.85)' : MUTED }}>{label}</span>
        <span style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1 }}>{value ?? '–'}</span>
        {sub ? <span style={{ fontSize: 12, color: accent ? 'rgba(255,255,255,0.8)' : MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span> : null}
      </span>
      <span style={{ flex: 'none', width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: accent ? 'rgba(255,255,255,0.16)' : TINT, color: accent ? '#fff' : BLUE }}>
        <I />
      </span>
    </>
  );
  const hover = {
    onMouseEnter: (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 32px -20px rgba(16,77,230,0.45)'; },
    onMouseLeave: (e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; },
  };
  if (onClick) return <button type="button" onClick={onClick} style={style} {...hover}>{inner}</button>;
  if (href) return <a href={href} style={style} {...hover}>{inner}</a>;
  return <div style={style}>{inner}</div>;
}

function Quick({ icon: I, label, intent, params, primary }) {
  return (
    <IntentLink
      intent={intent}
      params={params}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 56,
        padding: '0 16px',
        minWidth: 0,
        whiteSpace: 'nowrap',
        borderRadius: 16,
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: 14,
        color: primary ? '#fff' : INK,
        background: primary ? BLUE : SOFT,
        border: `1px solid ${primary ? BLUE : LINE}`,
      }}
    >
      <span style={{ fontSize: 18, display: 'flex', flex: 'none' }}><I /></span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ marginLeft: 'auto', opacity: 0.7, flex: 'none' }}>{intent === 'create' ? '+' : '→'}</span>
    </IntentLink>
  );
}

export function Overview() {
  const client = useClient({ apiVersion: '2024-10-01' });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState('new');

  const load = useCallback(() => {
    client
      .fetch(QUERY)
      .then((res) => { setData(res); setError(''); })
      .catch(() => setError('Could not load your stats. Check your connection and refresh.'));
  }, [client]);

  useEffect(() => {
    load();
    const sub = client
      .listen('*[_type in ["shoot", "equipment", "processStep", "enquiry"]]', {}, { visibility: 'query' })
      .subscribe({ next: () => setTimeout(load, 600), error: () => {} });
    return () => sub.unsubscribe();
  }, [client, load]);

  const toggleReplied = (e) => {
    const next = !e.replied;
    setData((d) => ({
      ...d,
      newEnquiries: Math.max(0, d.newEnquiries + (next ? -1 : 1)),
      latest: d.latest.map((x) => (x._id === e._id ? { ...x, replied: next } : x)),
    }));
    client.patch(e._id).set({ replied: next }).commit().catch(() => load());
  };

  const site = typeof window !== 'undefined' ? window.location.origin : '';
  const base = typeof window !== 'undefined' && window.location.pathname.startsWith('/studio') ? '/studio' : '';
  const first = OWNER_NAME;
  const enquiries = data ? data.latest.filter((e) => (filter === 'new' ? !e.replied : filter === 'replied' ? e.replied : true)) : [];

  return (
    <div style={{ height: '100%', overflow: 'auto', background: SOFT, fontFamily: BODY, color: INK }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* header */}
        <div style={{ ...card, padding: 'clamp(22px, 2.6vw, 32px)', background: BLUE, borderColor: BLUE, color: '#fff', position: 'relative', overflow: 'hidden', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20 }}>
          <svg viewBox="0 0 400 400" style={{ position: 'absolute', right: -120, top: -140, width: 420, height: 420, opacity: 0.35 }} aria-hidden="true">
            <circle cx="200" cy="200" r="180" fill="none" stroke="#fff" strokeDasharray="2 8" />
            <circle cx="200" cy="200" r="120" fill="none" stroke="#fff" strokeOpacity="0.6" />
          </svg>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ ...eyebrow, color: 'rgba(255,255,255,0.8)' }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <h1 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.05 }}>
              {greeting()}{first ? `, ${first}` : ''}.
            </h1>
            <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.88)' }}>
              {data
                ? data.newEnquiries
                  ? `You have ${data.newEnquiries} enquir${data.newEnquiries === 1 ? 'y' : 'ies'} waiting for a reply.`
                  : 'You’re all caught up on enquiries.'
                : 'Loading your overview…'}
            </span>
          </div>
          <div style={{ position: 'relative', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={site || '/'} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 999, background: '#fff', color: BLUE, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              <span style={{ fontSize: 18, display: 'flex' }}><EyeIcon /></span> View website ↗
            </a>
          </div>
        </div>

        {error ? <div style={{ ...card, color: '#b42318', fontWeight: 600 }}>{error}</div> : null}

        {/* stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
          <Stat icon={InboxIcon} label="To reply" value={data && data.newEnquiries} sub={data ? `${data.enquiries} enquiries in total` : ''} accent onClick={() => { setFilter('new'); const el = document.getElementById('lo-enquiries'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />
          <Stat icon={CameraIcon} label="Shoots" value={data && data.shoots} sub={data ? `${data.featured} on homepage${data.unpublished ? ` · ${data.unpublished} unpublished` : ''}` : ''} href={`${base}/structure/regular;shoot`} />
          <Stat icon={PhotoIcon} label="Photos" value={data && data.photos} sub="across all shoots" href={`${base}/structure/regular;shoot`} />
          <Stat icon={PlayIcon} label="Videos" value={data && data.videos} sub="across all shoots" href={`${base}/structure/regular;shoot`} />
          <Stat icon={KitIcon} label="Equipment" value={data && data.equipment} sub="items in your kit" href={`${base}/structure/regular;equipment`} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 24, alignItems: 'start' }}>
          {/* enquiries */}
          <div id="lo-enquiries" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16, scrollMarginTop: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h2 style={h2}>Enquiries</h2>
              <div style={{ display: 'flex', gap: 6, background: SOFT, padding: 4, borderRadius: 999 }}>
                {[['new', 'To reply'], ['replied', 'Replied'], ['all', 'All']].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    style={{ border: 0, cursor: 'pointer', padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, background: filter === id ? BLUE : 'transparent', color: filter === id ? '#fff' : INK }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {data && !enquiries.length ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: MUTED, fontSize: 14, border: `1.5px dashed ${LINE}`, borderRadius: 16 }}>
                {filter === 'new' ? 'Nothing waiting — nice work.' : 'No enquiries here yet.'}
              </div>
            ) : null}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {enquiries.map((e) => {
                const isOpen = open === e._id;
                return (
                  <div key={e._id} style={{ borderTop: `1px solid ${LINE}`, padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => toggleReplied(e)}
                        aria-pressed={!!e.replied}
                        title={e.replied ? 'Mark as not replied' : 'Mark as replied'}
                        style={{ flex: 'none', width: 26, height: 26, borderRadius: 8, border: `1.5px solid ${e.replied ? BLUE : '#c9d3e6'}`, background: e.replied ? BLUE : '#fff', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, padding: 0 }}
                      >
                        {e.replied ? '✓' : ''}
                      </button>
                      <button type="button" onClick={() => setOpen(isOpen ? null : e._id)} style={{ flex: 1, minWidth: 0, textAlign: 'left', border: 0, background: 'none', padding: 0, cursor: 'pointer', color: INK }}>
                        <span style={{ display: 'block', fontWeight: 600, fontSize: 15, textDecoration: e.replied ? 'line-through' : 'none', opacity: e.replied ? 0.6 : 1 }}>
                          {e.name || 'Unknown'}{e.company ? ` · ${e.company}` : ''}
                        </span>
                        <span style={{ display: 'block', fontSize: 13, color: MUTED }}>{[e.service, ago(e.receivedAt)].filter(Boolean).join(' · ')}</span>
                      </button>
                      {!e.replied ? <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: BLUE, background: TINT, padding: '5px 9px', borderRadius: 999 }}>New</span> : null}
                    </div>
                    {isOpen ? (
                      <div style={{ marginLeft: 38, padding: 16, borderRadius: 16, background: SOFT, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                        {e.details ? <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{e.details}</p> : <p style={{ margin: 0, color: MUTED }}>No project details given.</p>}
                        {e.budget ? <span style={{ color: MUTED }}>Budget: <strong style={{ color: INK }}>{e.budget}</strong></span> : null}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {e.email ? (
                            <a href={`mailto:${e.email}?subject=${encodeURIComponent('Re: your enquiry')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 999, background: BLUE, color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
                              <span style={{ display: 'flex' }}><MailIcon /></span> Reply to {e.email}
                            </a>
                          ) : null}
                          {e.phone ? <a href={`tel:${e.phone.replace(/\s+/g, '')}`} style={{ padding: '9px 14px', borderRadius: 999, background: '#fff', border: `1px solid ${LINE}`, color: INK, textDecoration: 'none', fontWeight: 600 }}>Call {e.phone}</a> : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* quick add + recent */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 style={h2}>Quick add</h2>
              <Quick icon={CameraIcon} label="New shoot" intent="create" params={{ type: 'shoot' }} primary />
              <Quick icon={KitIcon} label="Add equipment" intent="create" params={{ type: 'equipment' }} />
              <span style={{ ...eyebrow, color: MUTED, marginTop: 8 }}>Edit pages</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                <Quick icon={HomeIcon} label="Home" intent="edit" params={{ id: 'homePage', type: 'homePage' }} />
                <Quick icon={StarIcon} label="Services" intent="edit" params={{ id: 'servicesPage', type: 'servicesPage' }} />
                <Quick icon={PageIcon} label="About" intent="edit" params={{ id: 'aboutPage', type: 'aboutPage' }} />
                <Quick icon={StepsIcon} label="Process" intent="edit" params={{ id: 'processPage', type: 'processPage' }} />
                <Quick icon={MailIcon} label="Contact" intent="edit" params={{ id: 'contactPage', type: 'contactPage' }} />
                <Quick icon={SettingsIcon} label="Logo" intent="edit" params={{ id: 'siteSettings', type: 'siteSettings' }} />
              </div>
            </div>

            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 style={h2}>Recently edited shoots</h2>
              {data && !data.recent.length ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: MUTED, fontSize: 14, border: `1.5px dashed ${LINE}`, borderRadius: 16 }}>No shoots yet — add your first one above.</div>
              ) : null}
              {(data ? data.recent : []).map((s) => (
                <IntentLink key={s._id} intent="edit" params={{ id: s._id, type: 'shoot' }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 8, borderRadius: 16, textDecoration: 'none', color: INK }}>
                  <span style={{ width: 64, height: 48, borderRadius: 12, overflow: 'hidden', background: TINT, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: BLUE, fontSize: 20 }}>
                    {s.thumb ? <img src={`${s.thumb}?w=200&h=150&fit=crop&auto=format`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <CameraIcon />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.featured ? '★ ' : ''}{s.title || 'Untitled shoot'}</span>
                    <span style={{ display: 'block', fontSize: 13, color: MUTED }}>{[s.client, s.category].filter(Boolean).join(' · ') || 'No client yet'}</span>
                  </span>
                  <span style={{ color: MUTED }}>→</span>
                </IntentLink>
              ))}
            </div>

            <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, background: INK, borderColor: INK, color: '#fff' }}>
              <span style={{ fontSize: 22, display: 'flex', color: '#fff' }}><CheckIcon /></span>
              <span style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.85)' }}>
                Changes go live about 30 seconds after you press <strong style={{ color: '#fff' }}>Publish</strong>.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
