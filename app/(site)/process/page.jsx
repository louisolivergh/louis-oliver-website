import CtaBand from '@/components/CtaBand';
import Faqs from '@/components/Faqs';
import PageHero from '@/components/PageHero';
import { getSettings, two } from '@/lib/content';
import { Q, pick, sanityFetch } from '@/lib/sanity';

export const revalidate = 30;
export const metadata = { title: 'Process' };

export default async function ProcessPage() {
  const [p, steps, settings] = await Promise.all([sanityFetch(Q.process, {}, {}), sanityFetch(Q.steps, {}, []), getSettings()]);
  const page = p || {};
  const list = (steps || []).length
    ? steps
    : [{ _id: 'p', title: '[Step name]', duration: '[Typical duration]', description: '[Describe what happens in this step, what the client is involved in, and what is delivered at the end of it.]', outputs: ['[Output]', '[Output]'] }];
  const faqs = pick(page.faqs, [1, 2, 3].map((n) => ({ question: `[Frequently asked question ${n}?]`, answer: '[Answer to the question. Keep it clear and reassuring.]' })));

  return (
    <>
      <PageHero
        eyebrow="Process"
        line1={pick(page.heroLine1, '[A proven path from')}
        line2={pick(page.heroLine2, 'idea to impact.]')}
        intro={pick(page.intro, '[Explain how you work with clients and why your process gets results.]')}
      />

      <section className="container" style={{ paddingTop: 24, paddingBottom: 96 }}>
        {list.map((s, i) => (
          <article key={s._id || i} className="step-row reveal">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <span className="step-big">{two(i + 1)}</span>
              <h2 className="display" style={{ margin: 0, fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 600 }}>{s.title}</h2>
              {s.duration ? <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>{s.duration}</span> : null}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 12 }}>
              {s.description ? <p className="body pre" style={{ fontSize: 18 }}>{s.description}</p> : null}
              {(s.outputs || []).length ? (
                <div className="chips">
                  {s.outputs.map((o, k) => <span key={k} className="chip">{o}</span>)}
                </div>
              ) : null}
            </div>
          </article>
        ))}
        <div style={{ borderTop: '1px solid var(--line)' }} />
      </section>

      <section className="panel-wrap" style={{ paddingTop: 0 }}>
        <div className="panel grow" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '48px 80px' }}>
          <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <span className="eyebrow eyebrow-white">Questions</span>
            <h2 className="display" style={{ margin: 0, fontSize: 'clamp(36px, 4.2vw, 60px)', lineHeight: 1.02, fontWeight: 600 }}>
              {pick(page.faqTitle, '[Everything you need to know.]')}
            </h2>
          </div>
          <div className="reveal-2">
            <Faqs items={faqs} />
          </div>
        </div>
      </section>

      <CtaBand settings={settings} />
    </>
  );
}
