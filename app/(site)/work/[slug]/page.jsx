import Link from 'next/link';
import { notFound } from 'next/navigation';
import ShootSections from '@/components/ShootSections';
import { Arrow, BackArrow } from '@/components/Icons';
import { Q, sanityFetch } from '@/lib/sanity';

export const revalidate = 30;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await sanityFetch(Q.slugs, {}, []);
  return (slugs || []).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const s = await sanityFetch(Q.shoot, { slug }, null);
  return { title: s ? s.title : 'Work' };
}

const equipList = (e = [], extra = []) => [...(e || []), ...(extra || [])].filter(Boolean);

export default async function ShootPage({ params }) {
  const { slug } = await params;
  const [shoot, all, work] = await Promise.all([
    sanityFetch(Q.shoot, { slug }, null),
    sanityFetch(Q.shoots, {}, []),
    sanityFetch(Q.work, {}, {}),
  ]);
  if (!shoot) notFound();

  const meta = [shoot.category, shoot.year].filter(Boolean).join(' · ') || 'Shoot';
  const equipment = equipList(shoot.equipment, shoot.extraEquipment);
  const list = all || [];
  const idx = list.findIndex((s) => s.slug === slug);
  const next = list.length > 1 ? list[(idx + 1) % list.length] : null;
  const cols = [2, 3, 4].includes((work || {}).galleryColumns) ? work.galleryColumns : 3;
  const sections = (shoot.sections || []).map((s) => ({ ...s, equipmentList: equipList(s.equipment, s.extraEquipment) }));

  return (
    <article className="container" style={{ paddingTop: 'clamp(24px, 4.0vw, 48px)', paddingBottom: 'clamp(54px, 10.0vw, 120px)', display: 'flex', flexDirection: 'column', gap: 'clamp(25px, 4.7vw, 56px)' }}>
      <div className="fade f1">
        <Link href="/work" className="back"><BackArrow /> All work</Link>
      </div>

      <header style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <span className="eyebrow fade f1">{meta}</span>
        <h1 className="h1" style={{ fontSize: 'clamp(44px, 6vw, 92px)' }}>
          <span className="line d1"><span>{shoot.title}</span></span>
        </h1>
        {shoot.client ? <span className="fade f2" style={{ fontSize: 20, color: 'var(--text)' }}>{shoot.client}</span> : null}
      </header>

      {shoot.info || equipment.length ? (
        <section className="details fade f3">
          {shoot.info ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="label">Shoot info</span>
              <p className="pre" style={{ margin: 0, fontSize: 17, lineHeight: 1.75 }}>{shoot.info}</p>
            </div>
          ) : null}
          {equipment.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span className="label">Equipment used</span>
              <div className="chips">
                {equipment.map((e, i) => <span key={i} className="chip chip-white">{e}</span>)}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {sections.length ? (
        <ShootSections sections={sections} cols={cols} title={shoot.title} />
      ) : (
        <p className="empty" style={{ margin: 0, fontSize: 17, color: 'var(--muted)' }}>Photos and videos for this shoot are coming soon.</p>
      )}

      {next ? (
        <Link href={`/work/${next.slug}`} className="next-shoot">
          <span style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="label">Next shoot</span>
            <span className="display" style={{ fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 600 }}>{next.title}</span>
          </span>
          <span className="btn btn-primary">View shoot <Arrow /></span>
        </Link>
      ) : null}
    </article>
  );
}
