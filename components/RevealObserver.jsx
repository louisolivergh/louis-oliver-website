'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const SELECTOR = '.reveal, .reveal-2, .reveal-3, .grow';

/** Adds "is-in" to sections as they scroll into view, for the fade/rise animations. */
export default function RevealObserver() {
  const path = usePathname();

  useEffect(() => {
    const root = document.body;
    if (!('IntersectionObserver' in window)) return undefined;
    root.classList.add('reveal-ready');

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );

    const scan = () => {
      // wait while the mobile menu is still fading over a freshly opened page
      if (document.documentElement.classList.contains('menu-leaving')) return;
      document.querySelectorAll(SELECTOR).forEach((el) => {
        if (el.classList.contains('is-in')) return;
        const r = el.getBoundingClientRect();
        // already on screen (or above it) → show straight away
        if (r.top < window.innerHeight * 0.92) el.classList.add('is-in');
        else io.observe(el);
      });
    };

    scan();
    window.addEventListener('lo:page-in', scan);
    // catch content that appears later (filters, galleries, load more)
    const mo = new MutationObserver(() => scan());
    mo.observe(document.querySelector('main') || root, { childList: true, subtree: true });
    // safety net: never leave anything hidden
    const safety = setTimeout(() => !document.documentElement.classList.contains('menu-leaving') && document.querySelectorAll(SELECTOR).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) el.classList.add('is-in');
    }), 2500);

    return () => {
      window.removeEventListener('lo:page-in', scan);
      io.disconnect();
      mo.disconnect();
      clearTimeout(safety);
    };
  }, [path]);

  return null;
}
