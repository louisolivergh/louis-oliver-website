import Link from 'next/link';
import ContactForm from '@/components/ContactForm';
import FeaturedWork from '@/components/FeaturedWork';
import { Arrow, Icon, Rings, serviceIcon } from '@/components/Icons';
import { two } from '@/lib/content';
import { Q, focus, img, logoSrc, pick, sanityFetch } from '@/lib/sanity';

export const revalidate = 30;

const DEFAULT_SERVICES = [
  { name: '[Service one]', promise: '[Describe this service in two or three sentences. Focus on the outcome for the client.]' },
  { name: '[Service two]', promise: '[Describe this service in two or three sentences. Focus on the outcome for the client.]' },
  { name: '[Service three]', promise: '[Describe this service in two or three sentences. Focus on the outcome for the client.]' },
];

export default async function HomePage() {
  const [h, svc, steps, featured, contact, reviews] = await Promise.all([
    sanityFetch(Q.home, {}, {}),
    sanityFetch(Q.services, {}, {}),
    sanityFetch(Q.steps, {}, []),
    sanityFetch(Q.featured, {}, []),
    sanityFetch(Q.contact, {}, {}),
    sanityFetch(Q.reviews, {}, []),
  ]);
  const home = h || {};
  const heroStats = pick(home.heroStats, [
    { value: '[00+]', label: '[Stat label]' },
    { value: '[$0M]', label: '[Stat label]' },
    { value: '[00%]', label: '[Stat label]' },
  ]).filter((x) => x && x.show !== false);
  const showMetric = home.showMetric !== false;
  const showStatus = home.showStatus !== false;
  const aboutStats = pick(home.aboutStats, [
    { value: '[00+]', label: '[Years of experience]' },
    { value: '[000+]', label: '[Clients served]' },
    { value: '[$00M]', label: '[Value delivered]' },
    { value: '[00%]', label: '[Client retention]' },
  ]);
  const logoItems = (home.clientLogos || [])
    .filter((c) => c && c.show !== false && (c.logoUrl || c.name))
    .map((c) => ({ name: c.name || '', logo: c.logoUrl ? logoSrc(c.logoUrl, 60) : '' }));
  const hasLogoList = (home.clientLogos || []).length > 0;
  const fallbackNames = pick(home.clients, ['[CLIENT]', '[CLIENT]', '[CLIENT]', '[CLIENT]', '[CLIENT]', '[CLIENT]']).map((n) => ({ name: n, logo: '' }));
  const clientItems = hasLogoList ? logoItems : fallbackNames;
  const showClients = home.showClients !== false && clientItems.length > 0;
  /* repeat short lists so the scrolling strip never shows a gap */
  let loop = clientItems.slice();
  while (loop.length && loop.length < 8) loop = loop.concat(clientItems);
  const services = pick((svc || {}).services, DEFAULT_SERVICES).slice(0, 3);
  const stepList = (steps || []).length
    ? steps
    : [{ _id: 'p', title: '[Step name]', description: '[Short description of this step.]' }];
  const toReview = (r, slug, title) =>
    r && r.quote ? { quote: r.quote, name: r.name || '', role: r.role || '', photo: r.photo ? img(r.photo, 200) : '', slug: slug || '', shoot: title || '' } : null;
  const featuredList = (featured || []).length
    ? featured.map((f) => ({ title: f.title, meta: [f.client, f.category].filter(Boolean).join(' · ') || 'View shoot', href: `/work/${f.slug}`, slug: f.slug, review: toReview(f.review, f.slug, f.title) }))
    : [1, 2, 3, 4].map((n) => ({ title: `[Project / client ${['one', 'two', 'three', 'four'][n - 1]}]`, meta: '[Category]', href: '/work', slug: '', review: null }));
  let reviewList = (reviews || []).map((r) => toReview(r.review, r.slug, r.title)).filter(Boolean);
  if (!reviewList.length) {
    reviewList = [{
      quote: pick(home.testimonialQuote, '[Client testimonial goes here. A short, powerful quote about the results Louis Oliver delivered.]'),
      name: pick(home.testimonialName, '[Client name]'),
      role: pick(home.testimonialRole, '[Title, Company]'),
      photo: '',
      slug: '',
      shoot: '',
    }];
  }
  const c = contact || {};
  const rv = ['reveal', 'reveal-2', 'reveal-3'];

  return (
    <>
      {/* BANNER: full width, shown whole at the photo's own shape */}
      {home.bannerUrl ? (
        <div className="home-banner fade f1">
          <img
            src={img(home.bannerUrl, 2400)}
            srcSet={[800, 1200, 1600, 2400].map((w) => `${img(home.bannerUrl, w)} ${w}w`).join(', ')}
            sizes="100vw"
            width={home.bannerSize ? home.bannerSize.width : undefined}
            height={home.bannerSize ? home.bannerSize.height : undefined}
            alt={home.bannerAlt || ''}
          />
        </div>
      ) : null}

      {/* HERO */}
      <section className="container hero">
        <div className="hero-copy">
          <div className="tag fade f1">
            <span className="tag-dot dot-pulse" />
            {pick(home.heroTagline, '[Short tagline, e.g. your category]')}
          </div>
          <h1 className="h1 h1-home">
            <span className="line d1"><span>{pick(home.heroLine1, '[Your bold')}</span></span>
            <span className="line d2"><span>{pick(home.heroLine2, 'headline goes')}</span></span>
            <span className="line d3"><span className="blue">{pick(home.heroLine3, 'right here.]')}</span></span>
          </h1>
          <p className="lead fade f2" style={{ maxWidth: 520, fontSize: 19 }}>
            {pick(home.heroText, '[Supporting sentence. One or two lines explaining what Louis Oliver does and who it does it for.]')}
          </p>
          <div className="btn-row fade f3">
            <Link href="/contact" className="btn btn-primary">
              {pick(home.primaryButton, '[Primary action]')} <Arrow />
            </Link>
            <Link href="/work" className="btn btn-ghost">
              {pick(home.secondaryButton, '[Secondary action]')}
            </Link>
          </div>
          {heroStats.length ? (
            <div className="hero-stats fade f4">
              {heroStats.map((s, i) => (
                <div className="stat" key={i}>
                  <span className="stat-value">{s.value}</span>
                  <span className="stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="visual pop">
          <Rings stroke="rgba(255,255,255,0.4)" />
          <div className="visual-center">
            {home.heroPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="visual-photo" src={img(home.heroPhotoUrl, 800)} alt="" style={{ objectPosition: focus(home.heroHotspot) }} />
            ) : (
              <span className="visual-lo">LO</span>
            )}
          </div>
          {showMetric ? (
          <div className="metric-card float">
            <span className="metric-icon"><Icon name="trend" size={18} /></span>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="metric-label">{pick(home.metricLabel, '[Metric label]')}</span>
              <span className="metric-value">{pick(home.metricValue, '[+000%]')}</span>
            </span>
          </div>
          ) : null}
          {showStatus ? (
            <div className="status-pill float-2">
              <span className="status-dot pulse" />
              {pick(home.statusLine, '[Status line, e.g. now booking]')}
            </div>
          ) : null}
        </div>
      </section>

      {/* CLIENTS */}
      {showClients ? (
        <section className="clients" aria-label="Clients">
          <p className="clients-title">{pick(home.clientsTitle, '[Trusted by industry leaders]')}</p>
          <div className="marquee-wrap">
            <div className="marquee">
              {[...loop, ...loop].map((c, i) => (
                <span key={i} className="client" aria-hidden={i >= clientItems.length ? 'true' : undefined}>
                  {c.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logo} alt={i >= clientItems.length ? '' : c.name} loading="lazy" />
                  ) : (
                    c.name
                  )}
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* SERVICES */}
      <section className="container section">
        <div className="section-head reveal">
          <div className="section-head-copy">
            <span className="eyebrow">01 · Services</span>
            <h2 className="h2">{pick(home.servicesTitle, '[Section headline about what you offer.]')}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 400 }}>
            <p className="body">{pick(home.servicesIntro, '[Short intro paragraph for the services section.]')}</p>
            <Link href="/services" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>
              All services <Arrow />
            </Link>
          </div>
        </div>
        <div className="grid-3">
          {services.map((s, i) => (
            <Link key={i} href={`/services#service-${i + 1}`} className={`card ${rv[i % 3]}`}>
              <span className="card-icon"><Icon name={serviceIcon(s.name, i)} /></span>
              <h3 className="h3" style={{ fontSize: 26 }}>{s.name}</h3>
              <p className="card-text">{s.promise}</p>
              <span className="text-link" style={{ marginTop: 'auto', color: 'var(--blue)' }}>Learn more <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
      </section>

      {/* BLUE ABOUT PANEL */}
      <section className="panel-wrap">
        <div className="panel grow">
          <Rings variant="panel" />
          <div className="panel-grid">
            <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <span className="eyebrow eyebrow-white">02 · About Louis Oliver</span>
              <h2 className="display" style={{ margin: 0, fontSize: 'clamp(36px, 4.6vw, 68px)', lineHeight: 1.02, fontWeight: 600 }}>
                {pick(home.aboutTitle, '[A confident statement about your company and why clients choose you.]')}
              </h2>
            </div>
            <div className="reveal-2" style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingTop: 8 }}>
              <p className="pre" style={{ margin: 0, fontSize: 19, lineHeight: 1.65 }}>{pick(home.aboutText1, '[Paragraph one. Tell the story of the business, its experience, and the scale of results it delivers.]')}</p>
              <p className="pre" style={{ margin: 0, fontSize: 19, lineHeight: 1.65 }}>{pick(home.aboutText2, '[Paragraph two. Describe your approach, your standards and what working with you feels like.]')}</p>
              <Link href="/about" className="btn btn-white" style={{ alignSelf: 'flex-start' }}>
                {pick(home.aboutButton, '[Call to action]')} <Arrow />
              </Link>
            </div>
          </div>
          <div className="panel-stats">
            {aboutStats.map((s, i) => (
              <div key={i} className={`stat ${rv[Math.min(i, 2)]}`}>
                <span className="stat-value">{s.value}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="container" style={{ paddingTop: 'clamp(54px, 10.0vw, 120px)', paddingBottom: 'clamp(43px, 8.0vw, 96px)' }}>
        <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720, marginBottom: 64 }}>
          <span className="eyebrow">03 · How it works</span>
          <h2 className="h2">{pick(home.processTitle, '[A clear process from first call to results.]')}</h2>
          <Link href="/process" className="text-link">See the full process <span aria-hidden="true">→</span></Link>
        </div>
        <div className="steps-grid">
          {stepList.map((s, i) => (
            <Link key={s._id || i} href="/process" className="step-cell reveal">
              <span className="step-num">/{two(i + 1)}</span>
              <h3 className="h3">{s.title}</h3>
              <p className="card-text">{shorten(s.description || '')}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* WORK + TESTIMONIAL */}
      <FeaturedWork featured={featuredList} reviews={reviewList} />

      {/* CONTACT */}
      <section style={{ borderTop: '1px solid var(--line-soft)' }}>
        <div className="container" style={{ paddingTop: 'clamp(54px, 10.0vw, 120px)', paddingBottom: 'clamp(54px, 10.0vw, 120px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))', gap: 'clamp(29px, 5.3vw, 64px)' }}>
          <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <span className="eyebrow">05 · Contact</span>
            <h2 className="display" style={{ margin: 0, fontSize: 'clamp(44px, 5.6vw, 84px)', lineHeight: 0.98, fontWeight: 600 }}>
              {pick(home.contactTitle, '[Let’s build something big.]')}
            </h2>
            <p className="body" style={{ maxWidth: 440, fontSize: 18 }}>{pick(home.contactText, '[Invite prospective clients to get in touch. Mention response time.]')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 17, fontWeight: 500 }}>
              {c.email ? <a href={`mailto:${c.email}`} style={{ textDecoration: 'none' }}>{c.email}</a> : <span>[hello@yourdomain.com]</span>}
              <span>{pick(c.phone, '[+00 0000 000000]')}</span>
            </div>
          </div>
          <div className="reveal-2">
            <ContactForm compact />
          </div>
        </div>
      </section>
    </>
  );
}

function shorten(text) {
  const t = String(text || '');
  if (t.length <= 140) return t;
  return t.slice(0, 137).replace(/\s+\S*$/, '') + '…';
}

