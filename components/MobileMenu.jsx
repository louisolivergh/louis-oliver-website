'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Arrow } from './Icons';

/* How long each part takes (ms) — kept in step with the CSS in globals.css */
const PRESS_MS = 820; // the tap animation plays this long before we change page
const FADE_MS = 520; // the menu then fades away over the new page

/* Lets the new page's entrance animations play (they wait while the menu fades out). */
function releasePage() {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  if (!html.classList.contains('menu-leaving')) return;
  html.classList.remove('menu-leaving');
  window.dispatchEvent(new Event('lo:page-in'));
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Mobile menu with three calm phases:
 *  closed → open (panel unfolds, links rise in one by one)
 *  open → closing (whole panel fades out in one piece — nothing jumps or shifts)
 *  closing → closed
 * After a tap, the highlight stays on the chosen link until the panel has fully faded.
 */
export default function MobileMenu({ items }) {
  const [phase, setPhase] = useState('closed'); // 'closed' | 'open' | 'closing'
  const [going, setGoing] = useState(null);
  const [mounted, setMounted] = useState(false);
  const path = usePathname() || '/';
  const router = useRouter();
  const timers = useRef([]);
  const open = phase === 'open';

  const later = (fn, ms) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  };

  useEffect(() => {
    setMounted(true);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const close = useCallback(() => {
    setPhase((p) => (p === 'open' ? 'closing' : p));
  }, []);

  // once faded out, tidy up so the menu is fresh next time, then let the new page animate in
  useEffect(() => {
    if (phase !== 'closing') return undefined;
    const reduce = prefersReducedMotion();
    // the page starts animating in just as the last of the menu fades, so there's no blank pause
    const t1 = setTimeout(releasePage, reduce ? 0 : Math.round(FADE_MS * 0.6));
    const t2 = setTimeout(() => {
      setPhase('closed');
      setGoing(null);
      releasePage();
    }, reduce ? 0 : FADE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase]);

  useEffect(() => () => releasePage(), []);

  // the new page has arrived underneath → fade the menu away to reveal it
  useEffect(() => { close(); }, [path, close]);

  // stop the page behind from scrolling while the menu is showing
  useEffect(() => {
    if (phase === 'closed') return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [phase, close]);

  const toggle = () => {
    if (going) return;
    if (phase === 'open') close();
    else setPhase('open');
  };

  const goTo = (e, href, key) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let "open in new tab" work normally
    e.preventDefault();
    if (going) return;
    setGoing(key);
    router.prefetch(href);
    const here = path === href || path.startsWith(href + '/');
    later(() => {
      if (here) close();
      else {
        // hold the next page's entrance animations until the menu has faded away (see globals.css)
        document.documentElement.classList.add('menu-leaving');
        router.push(href);
        // safety net: if the page doesn't change for some reason, don't leave the menu stuck open
        later(close, 4000);
      }
    }, prefersReducedMotion() ? 0 : PRESS_MS);
  };

  return (
    <>
      <button
        type="button"
        className={`menu-btn${open ? ' open' : ''}`}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={toggle}
      >
        <span className="menu-lines" aria-hidden="true"><span /><span /></span>
      </button>
      {mounted
        ? createPortal(
            <div id="mobile-menu" className={`mobile-menu ${phase}`} aria-hidden={phase === 'closed'}>
              <div className="mobile-inner">
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
                        onClick={(e) => goTo(e, it.href, it.href)}
                      >
                        <span className="go-dot" aria-hidden="true" />
                        <span className="mobile-label">{it.label}</span>
                        <Arrow className="mobile-arrow" size={16} />
                      </Link>
                    );
                  })}
                </nav>
                <Link
                  href="/contact"
                  className={`btn btn-primary mobile-cta${going === 'cta' ? ' going' : ''}`}
                  style={{ '--i': items.length }}
                  tabIndex={open ? 0 : -1}
                  onTouchStart={() => {}}
                  onClick={(e) => goTo(e, '/contact', 'cta')}
                >
                  Book a call <Arrow />
                </Link>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
