'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Arrow } from './Icons';

/* How long each part takes (ms) — kept in step with the CSS in globals.css */
const PRESS_MS = 820; // the tap animation plays this long before we change page
const FADE_MS = 520; // the menu then fades away over the new page
const SETTLE_MS = 1250; // by now the menu has finished opening (panel + links rising in)
const DRAG_PX = 24; // a finger that slides further than this is dragging, not tapping
const LIFT_WAIT_MS = 600; // after a finger lifts, how long to wait for the tap to register

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
 *
 * Press feedback ("lit") starts the instant a finger touches a link and runs straight on into
 * the page change, then stays until the panel has fully faded. It deliberately doesn't use the
 * browser's own :active state: phones switch that off the moment the finger lifts, a split second
 * before the tap registers, which made the start of the animation stall and spring back.
 */
export default function MobileMenu({ items }) {
  const [phase, setPhase] = useState('closed'); // 'closed' | 'open' | 'closing'
  const [going, setGoing] = useState(null); // the link we're on our way to
  const [pressed, setPressed] = useState(null); // the link a finger (or mouse) is pressing right now
  const [settled, setSettled] = useState(false); // opening animation finished → presses respond instantly
  const [mounted, setMounted] = useState(false);
  const path = usePathname() || '/';
  const router = useRouter();
  const timers = useRef([]);
  const goingRef = useRef(null);
  const press = useRef(null); // { key, x, y, id } for the finger currently down
  const liftTimer = useRef(null);
  const open = phase === 'open';

  const later = (fn, ms) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  };

  useEffect(() => {
    setMounted(true);
    const list = timers.current;
    return () => {
      list.forEach(clearTimeout);
      clearTimeout(liftTimer.current);
    };
  }, []);

  const close = useCallback(() => {
    setPhase((p) => (p === 'open' ? 'closing' : p));
  }, []);

  // once the menu has finished opening: presses respond instantly, and every page in it is warmed
  // up in the background so nothing has to load at the moment of a tap
  useEffect(() => {
    if (phase !== 'open') return undefined;
    const t = setTimeout(() => {
      setSettled(true);
      [...items.map((it) => it.href), '/contact'].forEach((href) => {
        try { router.prefetch(href); } catch { /* prefetching is only a speed-up */ }
      });
    }, prefersReducedMotion() ? 0 : SETTLE_MS);
    return () => clearTimeout(t);
  }, [phase, items, router]);

  // once faded out, tidy up so the menu is fresh next time, then let the new page animate in
  useEffect(() => {
    if (phase !== 'closing') return undefined;
    const reduce = prefersReducedMotion();
    // the page starts animating in just as the last of the menu fades, so there's no blank pause
    const t1 = setTimeout(releasePage, reduce ? 0 : Math.round(FADE_MS * 0.6));
    const t2 = setTimeout(() => {
      setPhase('closed');
      goingRef.current = null;
      setGoing(null);
      press.current = null;
      clearTimeout(liftTimer.current);
      setPressed(null);
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
    if (goingRef.current) return;
    if (phase === 'open') close();
    else {
      setSettled(false); // links rise in one after another again
      setPhase('open');
    }
  };

  /* ---- press feedback ---- */
  const pressStart = (key) => (e) => {
    if (goingRef.current || phase !== 'open') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    clearTimeout(liftTimer.current);
    press.current = { key, x: e.clientX, y: e.clientY, id: e.pointerId };
    setPressed(key);
  };

  // finger slid away / gesture cancelled → let the highlight ease back
  const pressDrop = () => {
    clearTimeout(liftTimer.current);
    press.current = null;
    if (!goingRef.current) setPressed(null);
  };

  const pressMove = (e) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    if (Math.abs(e.clientX - p.x) > DRAG_PX || Math.abs(e.clientY - p.y) > DRAG_PX) pressDrop();
  };

  // finger lifted: the tap registers a moment later and carries the highlight straight on;
  // if it never does (e.g. the finger slid off), ease the highlight back
  const pressEnd = (e) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    clearTimeout(liftTimer.current);
    liftTimer.current = setTimeout(() => {
      if (!goingRef.current) setPressed(null);
    }, LIFT_WAIT_MS);
  };

  const pressLeave = (e) => {
    const p = press.current;
    if (p && p.id === e.pointerId) pressDrop();
  };

  const goTo = (e, href, key) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let "open in new tab" work normally
    e.preventDefault();
    if (goingRef.current) return;
    goingRef.current = key;
    setGoing(key);
    clearTimeout(liftTimer.current);
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

  const pressProps = (key) => ({
    onPointerDown: pressStart(key),
    onPointerMove: pressMove,
    onPointerUp: pressEnd,
    onPointerCancel: pressDrop,
    onPointerLeave: pressLeave,
  });

  const isLit = (key) => going === key || pressed === key;

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
            <div
              id="mobile-menu"
              className={`mobile-menu ${phase}${open && settled ? ' settled' : ''}`}
              aria-hidden={phase === 'closed'}
            >
              <div className="mobile-inner">
                <nav className="mobile-links" aria-label="Mobile">
                  {items.map((it, i) => {
                    const active = path === it.href || path.startsWith(it.href + '/');
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        className={`mobile-link${active ? ' active' : ''}${isLit(it.href) ? ' lit' : ''}`}
                        style={{ '--i': i }}
                        tabIndex={open ? 0 : -1}
                        {...pressProps(it.href)}
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
                  className={`btn btn-primary mobile-cta${isLit('cta') ? ' lit' : ''}`}
                  style={{ '--i': items.length }}
                  tabIndex={open ? 0 : -1}
                  {...pressProps('cta')}
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
