import Link from 'next/link';
import { NAV } from '@/lib/content';
import { Arrow } from './Icons';
import Logo from './Logo';
import NavLinks from './NavLinks';

export default function Header({ settings }) {
  return (
    <header className="site-header">
      <nav className="container nav" aria-label="Main">
        <Logo settings={settings} />
        <NavLinks items={NAV} />
        <Link href="/contact" className="btn btn-primary btn-sm">
          Book a call <Arrow />
        </Link>
      </nav>
    </header>
  );
}
