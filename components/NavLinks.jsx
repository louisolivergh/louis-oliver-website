'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLinks({ items }) {
  const path = usePathname() || '/';
  return (
    <div className="nav-links">
      {items.map((it) => {
        const active = path === it.href || path.startsWith(it.href + '/');
        return (
          <Link key={it.href} href={it.href} className={`nav-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
