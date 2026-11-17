'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useClient } from 'sanity';
import { IntentLink, useRouter } from 'sanity/router';
import {
  CalendarIcon,
  CameraIcon,
  CheckIcon,
  ClockIcon,
  EyeIcon,
  HomeIcon,
  InboxIcon,
  KitIcon,
  MailIcon,
  PageIcon,
  SettingsIcon,
  StarIcon,
  StepsIcon,
  TrendIcon,
  UsersIcon,
} from './DashIcons';
import { ShootsDash, totalsOf } from './ShootsDash';
import { partLabel, upcomingDaysOf, useShootData } from './shootData';
import { useClientsData } from './ClientsPane';
import { bookingTitle, fmtDay, isBooked, money, percent, relDay, tidyRange, todayYmd } from '../bookingData';

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
  "enquiries": count(*[_type == "enquiry" && ${PUB}]),
  "newEnquiries": count(*[_type == "enquiry" && ${PUB} && replied != true && declined != true]),
  "repliedEnquiries": count(*[_type == "enquiry" && ${PUB} && replied == true]),
  "latest": *[_type == "enquiry" && ${PUB}] | order(receivedAt desc)[0...8]{ _id, name, company, email, phone, service, budget, details, receivedAt, replied, declined },
  "recent": *[_type == "shoot" && ${PUB}] | order(_updatedAt desc)[0...5]{ _id, title, client, category, featured, "thumb": thumbnail.asset->url }
}`;


/* Overview animations, all prefixed lo-ov- so they don't touch the rest of the dashboard */
const CSS = `
@keyframes loOvUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes loOvScale { from { opacity: 0; transform: scale(.97); } to { opacity: 1; transform: none; } }
@keyframes loOvSpin { to { transform: rotate(360deg); } }
@keyframes loOvPop { 0% { transform: scale(.6); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
@keyframes loOvPulse { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,.55); } 100% { box-shadow: 0 0 0 10px rgba(255,255,255,0); } }
@keyframes loOvShine { from { transform: translateX(-120%) skewX(-20deg); } to { transform: translateX(320%) skewX(-20deg); } }
.lo-ov-in { animation: loOvUp .9s cubic-bezier(.16,1,.3,1) backwards; animation-delay: var(--d, 0ms); }
.lo-ov-hero { animation: loOvScale 1s cubic-bezier(.16,1,.3,1) backwards; }
.lo-ov-spin { transform-origin: 200px 200px; animation: loOvSpin 40s linear infinite; }
.lo-ov-spin-rev { transform-origin: 200px 200px; animation: loOvSpin 60s linear infinite reverse; }
.lo-ov-dot { width: 8px; height: 8px; border-radius: 50%; background: #fff; display: inline-block; animation: loOvPulse 2.2s ease-out infinite; }
.lo-ov-stat { position: relative; overflow: hidden; transition: transform .5s cubic-bezier(.16,1,.3,1), box-shadow .5s cubic-bezier(.16,1,.3,1), border-color .3s ease; }
.lo-ov-stat:hover { transform: translateY(-4px); box-shadow: 0 22px 40px -24px rgba(16,77,230,.55); border-color: #104de6 !important; }
.lo-ov-stat .lo-ov-ic { transition: transform .6s cubic-bezier(.16,1,.3,1), background .3s ease, color .3s ease; }
.lo-ov-stat:hover .lo-ov-ic { transform: scale(1.08); }
.lo-ov-stat:not(.lo-ov-accent):hover .lo-ov-ic { background: #104de6 !important; color: #fff !important; }
.lo-ov-accent::after { content: ""; position: absolute; top: 0; bottom: 0; left: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent); transform: translateX(-120%) skewX(-20deg); animation: loOvShine 1.4s cubic-bezier(.16,1,.3,1) 1.1s 1 forwards; pointer-events: none; }
.lo-ov-quick { transition: transform .4s cubic-bezier(.16,1,.3,1), box-shadow .4s cubic-bezier(.16,1,.3,1), background .3s ease, border-color .3s ease, color .3s ease; }
.lo-ov-quick:hover { transform: translateY(-2px); box-shadow: 0 14px 28px -18px rgba(16,77,230,.55); border-color: #104de6 !important; }
.lo-ov-quick .lo-ov-arrow { transition: transform .45s cubic-bezier(.7,0,.2,1); }
.lo-ov-quick:hover .lo-ov-arrow { transform: translateX(4px); }
.lo-ov-quick:hover .lo-ov-plus { transform: scale(1.25); }
.lo-ov-plus { transition: transform .45s cubic-bezier(.16,1,.3,1); display: inline-block; }
.lo-ov-row { animation: loOvUp .6s cubic-bezier(.16,1,.3,1) backwards; animation-delay: var(--d, 0ms); }
.lo-ov-check { flex: none; transition: background .25s ease, border-color .25s ease, transform .25s ease; }
.lo-ov-check:hover { transform: scale(1.08); border-color: #104de6 !important; }
.lo-ov-open { animation: loOvUp .45s cubic-bezier(.16,1,.3,1) backwards; }
.lo-ov-shoot { transition: background .3s ease, transform .4s cubic-bezier(.16,1,.3,1); }
.lo-ov-shoot:hover { background: #f4f7fd; transform: translateX(4px); }
.lo-ov-shoot img { transition: transform .8s cubic-bezier(.16,1,.3,1); }
.lo-ov-shoot:hover img { transform: scale(1.08); }
.lo-ov-tab { transition: background .3s ease, color .3s ease; }
.lo-ov-btn { transition: transform .4s cubic-bezier(.16,1,.3,1), box-shadow .4s ease; }
.lo-ov-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -14px rgba(11,18,32,.45); }
@keyframes loOvLeaveR { 0% { opacity: 1; transform: none; max-height: 420px; } 45% { opacity: 1; transform: translateX(0); max-height: 420px; } 100% { opacity: 0; transform: translateX(48px); max-height: 0; padding-top: 0; padding-bottom: 0; border-top-color: transparent; } }
@keyframes loOvLeaveL { 0% { opacity: 1; transform: none; max-height: 420px; } 45% { opacity: 1; transform: translateX(0); max-height: 420px; } 100% { opacity: 0; transform: translateX(-48px); max-height: 0; padding-top: 0; padding-bottom: 0; border-top-color: transparent; } }
@keyframes loOvFlash { 0% { background: rgba(16,77,230,.10); } 100% { background: transparent; } }
@keyframes loOvBump { 0% { transform: scale(1); } 40% { transform: scale(1.14); } 100% { transform: scale(1); } }
@keyframes loOvRing { 0% { box-shadow: 0 0 0 0 rgba(16,77,230,.45); } 100% { box-shadow: 0 0 0 10px rgba(16,77,230,0); } }
@keyframes loOvChip { 0% { opacity: 0; transform: translateX(-8px) scale(.9); } 100% { opacity: 1; transform: none; } }
.lo-ov-leave-r { overflow: clip; overflow-clip-margin: 12px; animation: loOvLeaveR .7s cubic-bezier(.7,0,.2,1) forwards !important; }
.lo-ov-leave-l { overflow: clip; overflow-clip-margin: 12px; animation: loOvLeaveL .7s cubic-bezier(.7,0,.2,1) forwards !important; }
.lo-ov-flash { animation: loOvFlash .9s ease-out !important; border-radius: 12px; }
.lo-ov-bump { animation: loOvBump .6s cubic-bezier(.16,1,.3,1); }
.lo-ov-count { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; margin-left: 6px; border-radius: 999px; font-size: 11px; font-weight: 700; transition: background .3s ease, color .3s ease; }
.lo-ov-check svg path { stroke-dasharray: 16; stroke-dashoffset: 16; transition: stroke-dashoffset .35s cubic-bezier(.7,0,.2,1); }
.lo-ov-check[aria-pressed="true"] svg path { stroke-dashoffset: 0; transition-delay: .08s; }
.lo-ov-check[aria-pressed="true"] { animation: loOvRing .6s ease-out; }
.lo-ov-name { position: relative; display: inline; transition: opacity .4s ease; background-image: linear-gradient(currentColor, currentColor); background-repeat: no-repeat; background-position: 0 58%; background-size: 0% 1.5px; transition: background-size .5s cubic-bezier(.7,0,.2,1), opacity .4s ease; }
.lo-ov-name[data-done="true"] { background-size: 100% 1.5px; opacity: .55; }
.lo-ov-chip { animation: loOvChip .4s cubic-bezier(.16,1,.3,1) both; }
@media (prefers-reduced-motion: reduce) {
  .lo-ov-leave-r, .lo-ov-leave-l, .lo-ov-flash, .lo-ov-bump, .lo-ov-chip, .lo-ov-check { animation: none !important; }
  .lo-ov-in, .lo-ov-hero, .lo-ov-row, .lo-ov-open { animation: none !important; }
  .lo-ov-spin, .lo-ov-spin-rev, .lo-ov-dot, .lo-ov-accent::after { animation: none !important; }
}
`;

/* Numbers count up smoothly when the page loads or a value changes */
function CountUp({ value, format }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (typeof value !== 'number') return undefined;
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(value); from.current = value; return undefined; }
    const start = performance.now();
    const a = from.current;
    const dur = 1100;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      setShown(Math.round(a + (value - a) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  if (typeof value !== 'number') return '…';
  return format ? format(shown) : shown;
}

/* "in 3 days", "tomorrow", or "on 12 Dec 2026" */
function nextWhen(date) {
  const r = relDay(date);
  return /^(In |Today|Tomorrow)/.test(r) ? r.toLowerCase() : `on ${r}`;
}

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

function Stat({ icon: I, label, value, sub, accent, href, onClick, format, delay = 0 }) {
  // label with its icon on the first line, then the number and the small print across the whole card
  const style = {
    ...card,
    padding: '20px 22px',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    columnGap: 12,
    rowGap: 6,
    alignItems: 'center',
    alignContent: 'start',
    background: accent ? BLUE : '#fff',
    borderColor: accent ? BLUE : LINE,
    color: accent ? '#fff' : INK,
    textDecoration: 'none',
    cursor: href || onClick ? 'pointer' : 'default',
    textAlign: 'left',
    font: 'inherit',
    width: '100%',
  };
  const inner = (
    <>
      <span style={{ gridColumn: 1, gridRow: 1, minWidth: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.25, color: accent ? 'rgba(255,255,255,0.85)' : MUTED, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{label}</span>
      <span style={{ gridColumn: '1 / -1', gridRow: 2, minWidth: 0, marginTop: -2, fontFamily: DISPLAY, fontSize: 34, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1, whiteSpace: 'nowrap' }}><CountUp value={value} format={format} /></span>
      <span className="lo-ov-ic" style={{ gridColumn: 2, gridRow: 1, flex: 'none', width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: accent ? 'rgba(255,255,255,0.16)' : TINT, color: accent ? '#fff' : BLUE }}>
        <I />
      </span>
      {sub ? <span style={{ gridColumn: '1 / -1', gridRow: 3, minWidth: 0, fontSize: 12, color: accent ? 'rgba(255,255,255,0.8)' : MUTED, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{sub}</span> : null}
    </>
  );
  const cls = `lo-ov-stat lo-ov-in${accent ? ' lo-ov-accent' : ''}`;
  const st = { ...style, '--d': `${delay}ms` };
  if (onClick) return <button type="button" onClick={onClick} className={cls} style={st}>{inner}</button>;
  if (href) return <a href={href} className={cls} style={st}>{inner}</a>;
  return <div className={cls} style={st}>{inner}</div>;
}

function Quick({ icon: I, label, intent, params, primary }) {
  return (
    <IntentLink
      intent={intent}
      params={params}
      className="lo-ov-quick"
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
      <span className={intent === 'create' ? 'lo-ov-plus' : 'lo-ov-arrow'} style={{ marginLeft: 'auto', opacity: 0.7, flex: 'none' }}>{intent === 'create' ? '+' : '→'}</span>
    </IntentLink>
  );
}

export function Overview() {
  const client = useClient({ apiVersion: '2024-10-01' });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState('new');
  const [leaving, setLeaving] = useState({});
  const [flash, setFlash] = useState(null);
  const [bump, setBump] = useState(null);
  const router = useRouter();
  const shoots = useShootData();

  const load = useCallback(() => {
    client
      .fetch(QUERY)
      .then((res) => { setData(res); setError(''); })
      .catch(() => setError('Could not load your stats. Check your connection and refresh.'));
  }, [client]);

  useEffect(() => {
    load();
    const sub = client
      .listen('*[_type in ["shoot", "equipment", "processStep", "enquiry", "booking"]]', {}, { visibility: 'query' })
      .subscribe({ next: () => setTimeout(load, 600), error: () => {} });
    return () => sub.unsubscribe();
  }, [client, load]);

  const toggleReplied = (e) => {
    if (leaving[e._id]) return;
    const next = !e.replied;
    client.patch(e._id).set({ replied: next }).commit().catch(() => load());
    const apply = () =>
      setData((d) => ({
        ...d,
        newEnquiries: e.declined ? d.newEnquiries : Math.max(0, d.newEnquiries + (next ? -1 : 1)),
        repliedEnquiries: Math.max(0, (d.repliedEnquiries || 0) + (next ? 1 : -1)),
        latest: d.latest.map((x) => (x._id === e._id ? { ...x, replied: next } : x)),
      }));
    setBump(next ? 'replied' : 'new');
    setTimeout(() => setBump(null), 650);
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hides = (filter === 'new' && next) || (filter === 'replied' && !next);
    if (hides && !reduce) {
      setLeaving((l) => ({ ...l, [e._id]: next ? 'replied' : 'new' }));
      setTimeout(() => {
        apply();
        setLeaving((l) => {
          const n = { ...l };
          delete n[e._id];
          return n;
        });
      }, 760);
    } else {
      apply();
      setFlash(e._id);
      setTimeout(() => setFlash((f) => (f === e._id ? null : f)), 900);
    }
  };

  const site = typeof window !== 'undefined' ? window.location.origin : '';
  const base = typeof window !== 'undefined' && window.location.pathname.startsWith('/studio') ? '/studio' : '';
  const first = OWNER_NAME;
  const enquiries = data ? data.latest.filter((e) => (filter === 'new' ? !e.replied && !e.declined : filter === 'replied' ? e.replied : true)) : [];

  /* the business, at a glance, saved shoots only, cancelled ones left out */
  const today = todayYmd();
  const counted = shoots.data ? shoots.data.bookings.filter((b) => b.status !== 'cancelled' && isBooked(b)) : [];
  // each day of a shoot booked over several days counts as its own shoot (shoot 1/2, shoot 2/2)
  const upcoming = upcomingDaysOf(counted, today);
  const nextShoot = upcoming[0] || null;
  const thisYear = totalsOf(counted.filter((b) => b.days[0] && b.days[0].slice(0, 4) === today.slice(0, 4)));
  const owed = counted.reduce((a, b) => a + b.money.outstanding, 0);
  const owedCount = counted.filter((b) => b.money.outstanding > 0).length;
  const openShoots = () => router.navigateUrl({ path: `${base || '/studio'}/shoots` });
  // your clients: the companies you shoot for, and how many are new this year
  const clients = useClientsData();
  const newClients = clients.companies.filter((c) => c.addedAt >= `${today.slice(0, 4)}-01-01`).length;
  const clientPeople = clients.companies.reduce((t, c) => t + c.people.length, 0) + clients.loners.length;
  const openClients = () => router.navigateUrl({ path: `${base || '/studio'}/updates/clients` });
  const showEnquiries = (id) => {
    setFilter(id);
    const el = document.getElementById('lo-enquiries');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', background: SOFT, fontFamily: BODY, color: INK }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* header */}
        <div className="lo-ov-hero" style={{ ...card, padding: 'clamp(22px, 2.6vw, 32px)', background: BLUE, borderColor: BLUE, color: '#fff', position: 'relative', overflow: 'hidden', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20 }}>
          <svg viewBox="0 0 400 400" style={{ position: 'absolute', right: -120, top: -140, width: 420, height: 420, opacity: 0.35 }} aria-hidden="true">
            <g className="lo-ov-spin"><circle cx="200" cy="200" r="180" fill="none" stroke="#fff" strokeDasharray="2 8" /><circle cx="200" cy="20" r="4" fill="#fff" /></g>
            <g className="lo-ov-spin-rev"><circle cx="200" cy="200" r="120" fill="none" stroke="#fff" strokeOpacity="0.6" strokeDasharray="90 30" /><circle cx="320" cy="200" r="5" fill="#fff" /></g>
          </svg>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="lo-ov-in" style={{ ...eyebrow, color: 'rgba(255,255,255,0.8)', display: 'inline-flex', alignItems: 'center', gap: 10, '--d': '120ms' }}><span className="lo-ov-dot" />{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <h1 className="lo-ov-in" style={{ '--d': '200ms', margin: 0, fontFamily: DISPLAY, fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.05 }}>
              {greeting()}{first ? `, ${first}` : ''}.
            </h1>
            <span className="lo-ov-in" style={{ '--d': '300ms', fontSize: 15, color: 'rgba(255,255,255,0.88)' }}>
              {data
                ? data.newEnquiries
                  ? `You have ${data.newEnquiries} enquir${data.newEnquiries === 1 ? 'y' : 'ies'} waiting for a reply.`
                  : 'You’re all caught up on enquiries.'
                : 'Loading your overview…'}
              {data && nextShoot ? ` Next shoot: ${bookingTitle(nextShoot)}${partLabel(nextShoot) ? ` (${partLabel(nextShoot).toLowerCase()})` : ''}, ${nextWhen(nextShoot.next)}.` : ''}
            </span>
          </div>
          <div className="lo-ov-in" style={{ '--d': '380ms', position: 'relative', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a className="lo-ov-btn" href={site || '/'} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 999, background: '#fff', color: BLUE, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              <span style={{ fontSize: 18, display: 'flex' }}><EyeIcon /></span> View website ↗
            </a>
          </div>
        </div>

        {error ? <div style={{ ...card, color: '#b42318', fontWeight: 600 }}>{error}</div> : null}

        {/* stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
          <Stat icon={InboxIcon} label="To reply" delay={200} value={data && data.newEnquiries} sub={data ? `${data.enquiries} enquiries in total` : ''} accent onClick={() => showEnquiries('new')} />
          <Stat icon={CalendarIcon} label="Upcoming shoots" delay={270} value={shoots.data ? upcoming.length : undefined} sub={shoots.data ? (nextShoot ? `Next: ${['Today', 'Tomorrow'].includes(relDay(nextShoot.next)) ? relDay(nextShoot.next).toLowerCase() : fmtDay(nextShoot.next, { weekday: 'short', day: 'numeric', month: 'short' })}` : 'None booked yet') : ''} onClick={openShoots} />
          <Stat
            icon={UsersIcon}
            label="Clients"
            delay={340}
            value={clients.loading ? undefined : clients.companies.length}
            sub={clients.loading ? '' : clients.companies.length ? [`${newClients} new in ${today.slice(0, 4)}`, clientPeople ? `${clientPeople} ${clientPeople === 1 ? 'person' : 'people'}` : ''].filter(Boolean).join(' · ') : 'Every company you shoot for'}
            onClick={openClients}
          />
          <Stat icon={TrendIcon} label={`Profit in ${today.slice(0, 4)}`} delay={410} value={shoots.data ? Math.round(thisYear.profit) : undefined} format={money} sub={shoots.data ? (thisYear.count ? `${thisYear.count} shoot${thisYear.count === 1 ? '' : 's'} ${thisYear.income ? ` · ${percent(thisYear.profit / thisYear.income)} margin` : ''}` : 'No shoots yet') : ''} onClick={openShoots} />
          <Stat icon={ClockIcon} label="Still to come in" delay={480} value={shoots.data ? Math.round(owed) : undefined} format={money} sub={shoots.data ? (owedCount ? `from ${owedCount} shoot${owedCount === 1 ? '' : 's'}` : 'Everyone’s paid up') : ''} onClick={openShoots} />
        </div>

        <ShootsDash base={base || '/studio'} data={shoots.data} setData={shoots.setData} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 24, alignItems: 'start' }}>
          {/* enquiries */}
          <div id="lo-enquiries" className="lo-ov-in" style={{ '--d': '550ms', ...card, display: 'flex', flexDirection: 'column', gap: 16, scrollMarginTop: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h2 style={h2}>Enquiries</h2>
              <div style={{ display: 'flex', gap: 6, background: SOFT, padding: 4, borderRadius: 999 }}>
                {[['new', 'To reply', data ? data.newEnquiries : 0], ['replied', 'Replied', data ? data.repliedEnquiries : 0], ['all', 'All', data ? data.enquiries : 0]].map(([id, label, n]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={`lo-ov-tab${bump === id ? ' lo-ov-bump' : ''}`}
                    style={{ border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '7px 10px 7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, background: filter === id ? BLUE : 'transparent', color: filter === id ? '#fff' : INK }}
                  >
                    {label}
                    <span className="lo-ov-count" style={{ background: filter === id ? 'rgba(255,255,255,0.22)' : '#e3e9f4', color: filter === id ? '#fff' : MUTED }}>{n}</span>
                  </button>
                ))}
              </div>
            </div>
            {data && !enquiries.length ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: MUTED, fontSize: 14, border: `1.5px dashed ${LINE}`, borderRadius: 16 }}>
                {filter === 'new' ? 'Nothing waiting. Nice work.' : 'No enquiries here yet.'}
              </div>
            ) : null}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {enquiries.map((e, i) => {
                const isOpen = open === e._id;
                const leave = leaving[e._id];
                const done = leave ? leave === 'replied' : !!e.replied;
                const rowCls = `lo-ov-row${leave ? (leave === 'replied' ? ' lo-ov-leave-r' : ' lo-ov-leave-l') : ''}${flash === e._id ? ' lo-ov-flash' : ''}`;
                return (
                  <div key={`${filter}-${e._id}`} className={rowCls} style={{ '--d': `${i * 60}ms`, borderTop: `1px solid ${LINE}`, padding: '14px 12px', margin: '0 -12px', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => toggleReplied(e)}
                        aria-pressed={done}
                        aria-label={done ? 'Mark as not replied' : 'Mark as replied'}
                        title={done ? 'Mark as not replied' : 'Mark as replied'}
                        className="lo-ov-check"
                        style={{ flex: 'none', width: 26, height: 26, borderRadius: 8, border: `1.5px solid ${done ? BLUE : '#c9d3e6'}`, background: done ? BLUE : '#fff', color: '#fff', transition: 'background .3s ease, border-color .3s ease, transform .25s ease', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, padding: 0 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7.4l3 3 6-6.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                      <button type="button" onClick={() => setOpen(isOpen ? null : e._id)} style={{ flex: 1, minWidth: 0, textAlign: 'left', border: 0, background: 'none', padding: 0, cursor: 'pointer', color: INK }}>
                        <span style={{ display: 'block', fontWeight: 600, fontSize: 15 }}>
                          <span className="lo-ov-name" data-done={done ? 'true' : 'false'}>{e.name || 'Unknown'}{e.company ? ` · ${e.company}` : ''}</span>
                        </span>
                        <span style={{ display: 'block', fontSize: 13, color: MUTED }}>{[e.service, ago(e.receivedAt)].filter(Boolean).join(' · ')}</span>
                      </button>
                      {leave ? (
                        <span className="lo-ov-chip" style={{ flex: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: leave === 'replied' ? '#fff' : BLUE, background: leave === 'replied' ? BLUE : TINT, padding: '5px 10px', borderRadius: 999 }}>
                          {leave === 'replied' ? 'Moved to Replied →' : '← Back to To reply'}
                        </span>
                      ) : !done ? (
                        <span className="lo-ov-chip" style={{ flex: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: BLUE, background: TINT, padding: '5px 9px', borderRadius: 999 }}>New</span>
                      ) : (
                        <span className="lo-ov-chip" style={{ flex: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTED, background: SOFT, padding: '5px 9px', borderRadius: 999 }}>Replied</span>
                      )}
                    </div>
                    {isOpen ? (
                      <div className="lo-ov-open" style={{ marginLeft: 40, padding: 16, borderRadius: 16, background: SOFT, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                        {e.details ? <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{e.details}</p> : <p style={{ margin: 0, color: MUTED }}>No project details given.</p>}
                        {e.budget ? <span style={{ color: MUTED }}>Budget: <strong style={{ color: INK }}>{tidyRange(e.budget)}</strong></span> : null}
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
            <div className="lo-ov-in" style={{ '--d': '620ms', ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 style={h2}>Quick add</h2>
              <Quick icon={CalendarIcon} label="Book a shoot" intent="create" params={[{ type: 'booking', template: 'booking-new' }, {}]} primary />
              <Quick icon={CameraIcon} label="Add to your portfolio" intent="create" params={{ type: 'shoot' }} />
              <Quick icon={KitIcon} label="Add equipment" intent="create" params={{ type: 'equipment' }} />
              <Quick icon={UsersIcon} label="Add client" intent="create" params={{ type: 'client', template: 'client' }} />
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

            <div className="lo-ov-in" style={{ '--d': '700ms', ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 style={h2}>Recently edited portfolio</h2>
              {data && !data.recent.length ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: MUTED, fontSize: 14, border: `1.5px dashed ${LINE}`, borderRadius: 16 }}>Nothing in your portfolio yet. Add your first shoot above.</div>
              ) : null}
              {(data ? data.recent : []).map((s) => (
                <IntentLink key={s._id} intent="edit" params={{ id: s._id, type: 'shoot' }} className="lo-ov-shoot" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 8, borderRadius: 16, textDecoration: 'none', color: INK }}>
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

            <div className="lo-ov-in" style={{ '--d': '780ms', ...card, display: 'flex', alignItems: 'center', gap: 14, background: INK, borderColor: INK, color: '#fff' }}>
              <span style={{ fontSize: 22, display: 'flex', color: '#fff' }}><CheckIcon /></span>
              <span style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.85)' }}>
                Website changes go live about 30 seconds after you press <strong style={{ color: '#fff' }}>Publish</strong>. Shoots in your calendar are private and save as you type.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
