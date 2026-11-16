import CtaBand from '@/components/CtaBand';
import PageHero from '@/components/PageHero';
import WorkLibrary from '@/components/WorkLibrary';
import { getSettings } from '@/lib/content';
import { Q, focus, img, pick, sanityFetch } from '@/lib/sanity';

export const revalidate = 30;
export const metadata = { title: 'Work' };

const SHAPES = { landscape: '4 / 3', portrait: '4 / 5', square: '1 / 1', wide: '16 / 9' };

export default async function WorkPage() {
  const [p, shoots, settings] = await Promise.all([sanityFetch(Q.work, {}, {}), sanityFetch(Q.shoots, {}, []), getSettings()]);
  const page = p || {};
  const cards = (shoots || []).map((s) => ({
    id: s._id,
    title: s.title || 'Untitled shoot',
    meta: [s.client, s.year].filter(Boolean).join(' · '),
    category: s.category || '',
    href: `/work/${s.slug}`,
    thumb: s.thumbUrl ? img(s.thumbUrl, 1200) : '',
    focus: focus(s.thumbHotspot),
    count: s.count || 0,
  }));

  return (
    <>
      <PageHero
        eyebrow="Work"
        line1={pick(page.heroLine1, '[Selected work for')}
        line2={pick(page.heroLine2, 'ambitious clients.]')}
        intro={pick(page.intro, '[A library of shoots. Use the filters to browse by category.]')}
      />
      <section className="container" style={{ paddingBottom: 'clamp(54px, 10.0vw, 120px)' }}>
        <WorkLibrary shoots={cards} ratio={SHAPES[page.thumbShape] || SHAPES.landscape} />
      </section>
      <CtaBand settings={settings} title="[Your project could be next.]" />
    </>
  );
}
