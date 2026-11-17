import ContactForm from '@/components/ContactForm';
import Faqs from '@/components/Faqs';
import { Q, pick, sanityFetch } from '@/lib/sanity';

export const revalidate = 30;
export const metadata = { title: 'Contact' };

export default async function ContactPage() {
  const [p, svc] = await Promise.all([sanityFetch(Q.contact, {}, {}), sanityFetch(Q.services, {}, {})]);
  const page = p || {};
  const serviceNames = pick(page.services, ((svc || {}).services || []).map((s) => s.name).filter(Boolean));
  const faqs = pick(page.faqs, [1, 2, 3].map((n) => ({ question: `[Common question ${n}?]`, answer: '[Answer to the question.]' })));

  return (
    <>
      <section className="container contact-grid" style={{ paddingTop: 'clamp(50px, 9.3vw, 112px)', paddingBottom: 'clamp(50px, 9.3vw, 112px)' }}>
        <div className="contact-head" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div className="fade f1"><span className="eyebrow">Contact</span></div>
          <h1 className="h1 h1-home">
            <span className="line d1"><span>{pick(page.heroLine1, '[Let’s talk about')}</span></span>
            <span className="line d2"><span className="blue">{pick(page.heroLine2, 'your next move.]')}</span></span>
          </h1>
          <p className="lead fade f2" style={{ maxWidth: 480, fontSize: 19 }}>
            {pick(page.intro, '[Tell prospective clients what happens after they get in touch, and how quickly you reply.]')}
          </p>
        </div>
        <div className="contact-info fade f3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 32, paddingTop: 32, borderTop: '1px solid var(--line-soft)', alignSelf: 'start' }}>
            <Detail label="Email">
              {page.email ? <a href={`mailto:${page.email}`} style={{ textDecoration: 'none' }}>{page.email}</a> : '[hello@yourdomain.com]'}
            </Detail>
            <Detail label="Phone">
              {page.phone ? <a href={`tel:${page.phone.replace(/\s+/g, '')}`} style={{ textDecoration: 'none', color: 'inherit' }}>{page.phone}</a> : '[+00 0000 000000]'}
            </Detail>
            <Detail label="Based in"><span className="pre">{pick(page.address, '[City, Postcode]')}</span></Detail>
            <Detail label="Hours">{pick(page.hours, '[Mon to Fri, 9:00 to 18:00]')}</Detail>
        </div>
        <div className="contact-form pop" style={{ background: 'var(--soft)', borderRadius: 32, padding: 'clamp(28px, 4vw, 56px)', alignSelf: 'start' }}>
          <ContactForm
            title={pick(page.formTitle, 'Start a project')}
            services={serviceNames}
            budgets={pick(page.budgets, [])}
            email={page.email || ''}
          />
        </div>
      </section>

      <section className="panel-wrap" style={{ paddingTop: 0, paddingBottom: 'clamp(43px, 8.0vw, 96px)' }}>
        <div className="panel grow" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 'clamp(28px, 5vw, 48px) clamp(32px, 6vw, 80px)' }}>
          <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <span className="eyebrow eyebrow-white">Before you reach out</span>
            <h2 className="display" style={{ margin: 0, fontSize: 'clamp(36px, 4.2vw, 60px)', lineHeight: 1.02, fontWeight: 600 }}>
              {pick(page.faqTitle, '[Common questions from new clients.]')}
            </h2>
          </div>
          <div className="reveal-2">
            <Faqs items={faqs} />
          </div>
        </div>
      </section>
    </>
  );
}

function Detail({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span className="field" style={{ fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}
