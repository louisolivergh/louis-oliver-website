'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Arrow, Icon } from './Icons';

const PAGE = 12;
const norm = (c) => String(c || '').trim().replace(/\s+/g, ' ').toLowerCase();

export default function WorkLibrary({ shoots, ratio }) {
  const [filter, setFilter] = useState('all');
  const [visible, setVisible] = useState(PAGE);

  const { options, labels } = useMemo(() => {
    const labels = {};
    const counts = {};
    let none = 0;
    shoots.forEach((s) => {
      const k = norm(s.category);
      if (!k) { none++; return; }
      if (!labels[k]) { labels[k] = String(s.category).trim().replace(/\s+/g, ' '); counts[k] = 0; }
      counts[k]++;
    });
    const keys = Object.keys(labels).sort((a, b) => labels[a].localeCompare(labels[b]));
    const options = [{ id: 'all', label: 'All work', n: shoots.length }, ...keys.map((k) => ({ id: k, label: labels[k], n: counts[k] }))];
    if (keys.length && none) options.push({ id: '__none', label: 'Other', n: none });
    return { options, labels };
  }, [shoots]);

  const active = options.some((o) => o.id === filter) ? filter : 'all';
  const shown = active === 'all' ? shoots : shoots.filter((s) => (active === '__none' ? !norm(s.category) : norm(s.category) === active));
  const label = active === 'all' ? '' : ` in ${active === '__none' ? 'Other' : labels[active]}`;

  if (!shoots.length) {
    return (
      <div className="empty fade f3">
        <span className="card-icon" style={{ borderRadius: '50%', width: 64, height: 64 }}><Icon name="camera" size={26} /></span>
        <p className="display" style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>New work is on its way. Check back soon.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(24px, 4.0vw, 48px)' }}>
      <div className="fade f3" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div className="pills" role="group" aria-label="Filter shoots by category">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`pill${o.id === active ? ' on' : ''}`}
              aria-pressed={o.id === active}
              onClick={() => { setFilter(o.id); setVisible(PAGE); }}
            >
              {o.label}
              <span className="pill-n">{o.n}</span>
            </button>
          ))}
        </div>
        <span role="status" style={{ fontSize: 15, color: 'var(--muted)' }}>
          {shown.length === 1 ? '1 shoot' : `${shown.length} shoots`}{label}
        </span>
      </div>

      <div className="shoots" key={active}>
        {shown.slice(0, visible).map((s) => (
          <Link key={s.id} href={s.href} className="shoot-card">
            <span className="shoot-media" style={{ aspectRatio: ratio }}>
              {s.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="shoot-fill" src={s.thumb} alt="" loading="lazy" style={{ objectPosition: s.focus }} />
              ) : (
                <span className="shoot-fill placeholder" style={{ background: 'var(--tint)', color: 'var(--blue)' }}>No thumbnail yet</span>
              )}
              <span className="shoot-veil" aria-hidden="true">
                <span className="shoot-cta">View shoot <Arrow className="" /></span>
              </span>
              <span className="shoot-badge">{s.count === 1 ? '1 item' : `${s.count} items`}</span>
            </span>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <span className="shoot-title"><span>{s.title}</span></span>
                {s.meta ? <span className="shoot-meta">{s.meta}</span> : null}
              </span>
              <span className="shoot-arrow"><Arrow className="" /></span>
            </span>
          </Link>
        ))}
      </div>

      {shown.length > visible ? (
        <button type="button" className="btn btn-ghost" style={{ alignSelf: 'center' }} onClick={() => setVisible((v) => v + PAGE)}>
          Load more shoots
        </button>
      ) : null}
    </div>
  );
}
