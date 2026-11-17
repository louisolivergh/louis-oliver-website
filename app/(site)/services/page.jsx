import Link from 'next/link';
import CtaBand from '@/components/CtaBand';
import { Arrow, Icon, Rings, serviceIcon } from '@/components/Icons';
import PageHero from '@/components/PageHero';
import { getSettings, two } from '@/lib/content';
import { Q, pick, sanityFetch } from '@/lib/sanity';

export const revalidate = 30;
export const metadata = { title: 'Services' };

const placeholderService = (n) => ({
  name: `[Service ${n}]`,
  promise: '[A one-line promise: the transformation this service delivers.]',
  description: '[Describe the service in detail: the problem it solves, who it is for, how you deliver it and the result clients can expect.]',
  includes: [1, 2, 3, 4].map((i) => ({ title: `[What’s included ${i}]`, detail: '[Explain what this part of the service includes and why it matters to the client.]' })),
  price: '[From £00,000 · or price on request]',
  resultLabel: '[Key result]',
  resultValue: '[+000%]',
});

const THEMES = [
  { cls: 'svc-white', btn: 'btn-primary', visualBg: 'var(--blue)', ring: 'rgba(255,255,255,0.45)', fg: '#fff' },
  { cls: 'svc-blue', btn: 'btn-white', visualBg: '#fff', ring: 'rgba(16,77,230,0.35)', fg: 'var(--blue)' },
  { cls: 'svc-navy', btn: 'btn-white', visualBg: 'var(--blue)', ring: 'rgba(255,255,255,0.45)', fg: '#fff' },
];

export default async function ServicesPage() {
  const [p, settings] = await Promise.all([sanityFetch(Q.services, {}, {}), getSettings()]);
  const page = p || {};
  const services = pick(page.services, ['one', 'two', 'three'].map(placeholderService)).slice(0, 3);
  const reasons = pick(page.reasons, [1, 2, 3].map(() => ({ title: '[Why clients choose me]', text: '[A reason that sets Louis Oliver apart.]' })));
  const total = two(services.length);

  return (
    <>
      <PageHero
        eyebrow="Services"
        line1={pick(page.heroLine1, '[What I do,')}
        line2={pick(page.heroLine2, 'done properly.]')}
        intro={pick(page.intro, '[Introduce your services and the kind of clients you serve.]')}
      />

      <section className="container" style={{ paddingBottom: 'clamp(24px, 3.3vw, 40px)' }}>
        <div className="svc-jump fade f3">
          {services.map((s, i) => (
            <a key={i} href={`#service-${i + 1}`} className="card">
              <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span className="step-num">{two(i + 1)}</span>
                <span className="display" style={{ fontSize: 20, fontWeight: 600 }}>{s.name}</span>
              </span>
              <span aria-hidden="true" style={{ color: 'var(--blue)' }}>↓</span>
            </a>
          ))}
        </div>
      </section>

      <section className="svc-list">
        {services.map((s, i) => {
          const th = THEMES[i % 3];
          const includes = pick(s.includes, []);
          return (
            <article key={i} id={`service-${i + 1}`} className={`svc grow ${th.cls}`}>
              <div className="svc-copy reveal">
                <span className="sv-eyebrow">Service {two(i + 1)} / {total}</span>
                <h2 className="svc-title">{s.name}</h2>
                {s.promise ? <p className="svc-promise">{s.promise}</p> : null}
                {s.description ? <p className="body muted pre">{s.description}</p> : null}
                {includes.length ? (
                  <ul className="inc-list">
                    {includes.map((it, k) => (
                      <li key={k}>
                        <details className="inc">
                          <summary>
                            <span className="inc-dot">
                              <span className="inc-ico" aria-hidden="true">
                                <span className="bar bar-a" />
                                <span className="bar bar-b" />
                              </span>
                            </span>
                            <span>{it.title}</span>
                          </summary>
                          {it.detail ? <p className="inc-body pre">{it.detail}</p> : null}
                        </details>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px 32px' }}>
                  <Link href="/contact" className={`btn ${th.btn}`}>
                    Enquire about this service <Arrow />
                  </Link>
                  {s.price ? <span className="muted" style={{ fontSize: 15 }}>{s.price}</span> : null}
                </div>
              </div>
              <div className="svc-visual reveal-2" style={{ background: th.visualBg, order: i === 1 ? 2 : undefined }}>
                <Rings stroke={th.ring} dot={th.fg} />
                <div className="svc-icon" style={{ color: th.fg }}>
                  <Icon name={serviceIcon(s.name, i)} size={120} />
                </div>
                <span className="svc-num" style={{ color: th.fg }}>{two(i + 1)}</span>
                {s.resultValue ? (
                  <div className={`svc-card ${i === 1 ? 'float-2' : 'float'}`}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.resultLabel}</span>
                    <span className="display" style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>{s.resultValue}</span>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      <section className="container" style={{ paddingBottom: 'clamp(43px, 8.0vw, 96px)', display: 'flex', flexDirection: 'column', gap: 'clamp(24px, 4.0vw, 48px)' }}>
        <div className="reveal section-head-copy">
          <span className="eyebrow">The difference</span>
          <h2 className="h2">{pick(page.whyTitle, '[Why the biggest clients work with me.]')}</h2>
        </div>
        <div className="grid-3">
          {reasons.map((r, i) => (
            <div key={i} className={`card ${['reveal', 'reveal-2', 'reveal-3'][i % 3]}`}>
              <span className="card-icon"><Icon name={['pulse', 'grid', 'star'][i % 3]} /></span>
              <h3 className="h3">{r.title}</h3>
              <p className="card-text">{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaBand settings={settings} />
    </>
  );
}
