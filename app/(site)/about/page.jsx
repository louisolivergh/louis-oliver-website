import CtaBand from '@/components/CtaBand';
import { Icon, Rings } from '@/components/Icons';
import PageHero from '@/components/PageHero';
import { getSettings, two } from '@/lib/content';
import { Q, focus, img, pick, sanityFetch } from '@/lib/sanity';
import { EQUIPMENT_CATEGORIES } from '@/sanity/categories';

export const revalidate = 30;
export const metadata = { title: 'About' };

const CAT_ICONS = { cameras: 'camera', lenses: 'lens', lighting: 'light', audio: 'mic', stabilisation: 'drone', editing: 'screen' };

export default async function AboutPage() {
  const [p, kit, settings] = await Promise.all([sanityFetch(Q.about, {}, {}), sanityFetch(Q.equipment, {}, []), getSettings()]);
  const page = p || {};
  const story = pick(page.story, '[Paragraph one of your story. The beginning, the first big client.]\n\n[Paragraph two. Growth, milestones and the reputation you have built.]\n\n[Paragraph three. Your mission and where the business is heading next.]')
    .split(/\n\s*\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  const values = pick(page.values, [1, 2, 3].map((n) => ({ title: `[Value ${n}]`, text: '[What this value means in practice.]' }))).slice(0, 3);
  const groups = EQUIPMENT_CATEGORIES.map((c) => ({ ...c, items: (kit || []).filter((k) => k.category === c.value) }));
  const rv = ['reveal', 'reveal-2', 'reveal-3'];

  return (
    <>
      <PageHero
        eyebrow="About Louis Oliver"
        line1={pick(page.heroLine1, '[The story behind')}
        line2={pick(page.heroLine2, 'the name.]')}
        intro={pick(page.intro, '[A short introduction: who you are, what you stand for, and why it matters to your clients.]')}
      />

      <section className="container story">
        <div className="media reveal" style={{ aspectRatio: '4 / 5' }}>
          {page.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="media-fill" src={img(page.photoUrl, 1200)} alt="" style={{ objectPosition: focus(page.photoHotspot) }} />
          ) : (
            <div className="placeholder">[Your photo]</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingTop: 16 }}>
          <span className="eyebrow reveal">01 — The story</span>
          <h2 className="display reveal" style={{ margin: 0, fontSize: 'clamp(34px, 3.6vw, 52px)', lineHeight: 1.06, fontWeight: 600 }}>
            {pick(page.storyTitle, '[How Louis Oliver started and where it is going.]')}
          </h2>
          {story.map((para, i) => (
            <p key={i} className={`body ${rv[Math.min(i + 1, 2)]}`} style={{ fontSize: 18 }}>{para}</p>
          ))}
        </div>
      </section>

      <section className="panel-wrap" style={{ paddingTop: 0 }}>
        <div className="panel grow" style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
          <Rings variant="panel" />
          <div className="reveal" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
            <span className="eyebrow eyebrow-white">02 — Values</span>
            <h2 className="display" style={{ margin: 0, fontSize: 'clamp(36px, 4.6vw, 64px)', lineHeight: 1.02, fontWeight: 600 }}>
              {pick(page.valuesTitle, '[The principles behind every project.]')}
            </h2>
          </div>
          <div className="values" style={{ position: 'relative' }}>
            {values.map((v, i) => (
              <div key={i} className={`value ${rv[i % 3]}`}>
                <span className="display" style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>/{two(i + 1)}</span>
                <h3 className="display" style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>{v.title}</h3>
                <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container" style={{ paddingTop: 120, paddingBottom: 96, display: 'flex', flexDirection: 'column', gap: 56 }}>
        <div className="section-head reveal" style={{ marginBottom: 0 }}>
          <div className="section-head-copy">
            <span className="eyebrow">03 — Equipment</span>
            <h2 className="h2">{pick(page.equipmentTitle, '[The kit behind every shoot.]')}</h2>
          </div>
          <p className="body" style={{ maxWidth: 400 }}>{pick(page.equipmentIntro, '[A short line about your setup and why it matters for the quality clients get.]')}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 24 }}>
          {groups.map((g, i) => (
            <article key={g.value} className={`eq-card ${rv[i % 3]}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <span className="card-icon"><Icon name={CAT_ICONS[g.value]} size={26} /></span>
                <span className="step-num" style={{ fontSize: 14 }}>/{two(i + 1)}</span>
              </div>
              <h3 className="h3" style={{ fontSize: 26 }}>{g.title}</h3>
              <ul className="eq-list">
                {(g.items.length ? g.items : [{ _id: 'x', name: '[Item name]', spec: '[Spec]' }]).map((k) => (
                  <li key={k._id}>
                    <span>{k.name}</span>
                    <span>{k.spec || ''}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <CtaBand settings={settings} />
    </>
  );
}
