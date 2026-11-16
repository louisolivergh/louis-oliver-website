import Link from 'next/link';
import { NAV } from '@/lib/content';
import { Arrow } from './Icons';
import Logo from './Logo';
import MobileMenu from './MobileMenu';
import NavLinks from './NavLinks';

export default function Header({ settings }) {
  return (
    <header className="site-header">
      <nav className="container nav" aria-label="Main">
        <Logo settings={settings} />
        <NavLinks items={NAV} />
        <Link href="/contact" className="btn btn-primary btn-sm nav-cta">
          Book a call <Arrow />
        </Link>
        <MobileMenu items={NAV} />
      </nav>
    </header>
  );
}
