import Link from 'next/link';
import Logo from './Logo';

export default function Footer({ settings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-top">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
            <Logo settings={settings} footer />
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>{settings.footerText}</p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <span className="footer-head">Company</span>
              <Link href="/about">About</Link>
              <Link href="/services">Services</Link>
              <Link href="/process">Process</Link>
            </div>
            <div className="footer-col">
              <span className="footer-head">Explore</span>
              <Link href="/work">Work</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/">Home</Link>
            </div>
            {settings.socials.length ? (
              <div className="footer-col">
                <span className="footer-head">Social</span>
                {settings.socials.map((s, i) => (
                  <a key={i} href={s.url || '#'} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {year} {settings.logoName}. All rights reserved.</span>
          <span>Photo &amp; video</span>
        </div>
      </div>
    </footer>
  );
}
