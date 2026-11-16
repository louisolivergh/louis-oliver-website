import Link from 'next/link';
import { Arrow, Rings } from './Icons';

export default function CtaBand({ settings, title }) {
  return (
    <section className="panel-wrap" style={{ paddingBottom: 'clamp(43px, 8.0vw, 96px)' }}>
      <div className="panel grow cta-panel">
        <Rings variant="panel" />
        <div className="reveal" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
          <h2 className="display" style={{ margin: 0, fontSize: 'clamp(36px, 5vw, 72px)', lineHeight: 1, fontWeight: 600 }}>
            {title || settings.ctaTitle}
          </h2>
          <p style={{ margin: 0, fontSize: 19, lineHeight: 1.6 }}>{settings.ctaText}</p>
        </div>
        <Link href="/contact" className="btn btn-white reveal-2" style={{ position: 'relative' }}>
          {settings.ctaButton} <Arrow />
        </Link>
      </div>
    </section>
  );
}
