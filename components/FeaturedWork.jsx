'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Arrow } from './Icons';

const ROTATE_MS = 6500;

function initials(name) {
  return (
    String(name || '')
      .replace(/[^\p{L}\s]/gu, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'LO'
  );
}

/**
 * Featured work + reviews.
 * Reviews rotate on their own; hovering a featured shoot shows that shoot's review.
 */
export default function FeaturedWork({ featured, reviews }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(null); // review shown while hovering a row
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);

  const many = reviews.length > 1;

  useEffect(() => {
    if (!many || hovered || paused) return undefined;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;
    timer.current = setTimeout(() => setIndex((i) => (i + 1) % reviews.length), ROTATE_MS);
    return () => clearTimeout(timer.current);
  }, [index, many, hovered, paused, reviews.length]);

  const current = hovered || reviews[index % reviews.length];
  const key = hovered ? `h-${hovered.slug}` : `r-${index}`;

  const showFor = (f) => {
    if (!f.review) return;
    setHovered(f.review);
  };
  const clear = () => {
    if (hovered) {
      const i = reviews.findIndex((r) => r.slug && r.slug === hovered.slug);
      if (i >= 0) setIndex(i);
    }
    setHovered(null);
  };

  return (
    <section className="container split">
      <div
        className={`quote-card reveal${hovered ? ' quote-linked' : ''}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-live="polite"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <span className="eyebrow">04 · Client results</span>
          {current.shoot ? (
            <span key={`tag-${key}`} className="quote-tag">From the {current.shoot} shoot</span>
          ) : null}
        </div>

        <div key={key} className="quote-swap">
          <blockquote className="quote">“{current.quote}”</blockquote>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div key={`p-${key}`} className="quote-swap" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {current.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.photo} alt="" className="avatar" style={{ objectFit: 'cover' }} />
            ) : (
              <span className="avatar" aria-hidden="true">{initials(current.name)}</span>
            )}
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 600 }}>{current.name}</span>
              {current.role ? <span style={{ fontSize: 14, color: 'var(--muted)' }}>{current.role}</span> : null}
            </span>
          </div>
          {many && !hovered ? (
            <div className="quote-dots" role="tablist" aria-label="Choose a review">
              {reviews.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Review ${i + 1}${r.shoot ? `: ${r.shoot}` : ''}`}
                  className={`quote-dot${i === index ? ' on' : ''}`}
                  onClick={() => setIndex(i)}
                >
                  {i === index && !paused ? <span key={`bar-${index}`} className="quote-dot-fill" style={{ animationDuration: `${ROTATE_MS}ms` }} /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="dark-card reveal-2" onMouseLeave={clear}>
        <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 24 }}>Featured work</span>
        {featured.map((f, i) => (
          <Link
            key={i}
            href={f.href}
            className={`row-link${hovered && f.review && hovered === f.review ? ' row-active' : ''}`}
            onMouseEnter={() => showFor(f)}
            onFocus={() => showFor(f)}
            onBlur={clear}
          >
            <span className="row-title">{f.title}</span>
            <span className="row-meta">
              {f.review ? <span className="row-review">Review</span> : null}
              {f.meta}
              <span className="row-arrow" aria-hidden="true"><Arrow className="" size={12} /></span>
            </span>
          </Link>
        ))}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.15)' }} />
      </div>
    </section>
  );
}
