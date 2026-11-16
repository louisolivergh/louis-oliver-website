'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Arrow } from './Icons';

export default function MobileMenu({ items }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [going, setGoing] = useState(null);
  useEffect(() => setMounted(true), []);
  const path = usePathname() || '/';

  useEffect(() => { setOpen(false); setGoing(null); }, [path]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`menu-btn${open ? ' open' : ''}`}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="menu-lines" aria-hidden="true"><span /><span /></span>
      </button>
      {mounted ? createPortal(
      <div id="mobile-menu" className={`mobile-menu${open ? ' open' : ''}`} aria-hidden={!open}>
        <nav className="mobile-links" aria-label="Mobile">
          {items.map((it, i) => {
            const active = path === it.href || path.startsWith(it.href + '/');
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`mobile-link${active ? ' active' : ''}${going === it.href ? ' going' : ''}`}
                style={{ '--i': i }}
                tabIndex={open ? 0 : -1}
                onTouchStart={() => {}}
                onClick={() => { setGoing(it.href); if (active) setTimeout(() => setOpen(false), 260); }}
              >
                <span className="go-dot" aria-hidden="true" />
                <span>{it.label}</span>
                <Arrow className="" size={16} />
              </Link>
            );
          })}
        </nav>
        <Link href="/contact" className="btn btn-primary mobile-cta" style={{ '--i': items.length }} tabIndex={open ? 0 : -1}>
          Book a call <Arrow />
        </Link>
      </div>,
        document.body
      ) : null}
    </>
  );
}
