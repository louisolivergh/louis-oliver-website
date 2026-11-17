'use client';

import { useEffect, useMemo, useState } from 'react';
import { useClient } from 'sanity';
import { embedUrl, fileFromRef, imageFromRef } from '../assets';

const BLUE = '#104de6';
const INK = '#0b1220';
const TEXT = '#4a5468';
const MUTED = '#5b6475';
const SOFT = '#f4f7fd';
const TINT = '#eef3fe';
const LINE = '#e6eaf1';
const DISPLAY = 'var(--font-sora), Inter, system-ui, sans-serif';
const BODY = 'var(--font-inter), Inter, system-ui, sans-serif';
const SHAPE = { landscape: '16 / 9', vertical: '9 / 16', square: '1 / 1', portrait: '4 / 5' };

const label = { fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED };
const chip = { display: 'inline-flex', padding: '6px 12px', borderRadius: 999, background: TINT, color: BLUE, fontSize: 13, fontWeight: 600 };

function collectRefs(doc) {
  const ids = new Set();
  const add = (arr) => (arr || []).forEach((r) => r && r._ref && ids.add(r._ref));
  add(doc.equipment);
  (doc.sections || []).forEach((s) => add(s.equipment));
  return [...ids];
}

function Empty({ children, ratio = '16 / 9', dark = false }) {
  return (
    <div style={{ aspectRatio: ratio, borderRadius: 14, border: `1.5px dashed ${dark ? 'rgba(255,255,255,0.3)' : '#c9d3e6'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dark ? 'rgba(255,255,255,0.7)' : MUTED, fontSize: 13, textAlign: 'center', padding: 16 }}>
      {children}
    </div>
  );
}

const CLIP = { position: 'relative', overflow: 'hidden', borderRadius: 12, isolation: 'isolate', lineHeight: 0, transform: 'translateZ(0)', WebkitMaskImage: '-webkit-radial-gradient(white, black)' };

function Video({ v, inGrid, radius = 12 }) {
  if (!v) return <Empty>Add a video</Empty>;
  const fileUrl = v.file && v.file.asset ? fileFromRef(v.file.asset._ref) : null;
  if (fileUrl) {
    const poster = v.poster && v.poster.asset ? imageFromRef(v.poster.asset._ref, 1000) : null;
    // The rounded corners are cut by a wrapper (Safari doesn't round a video cleanly on its own), and nothing
    // black sits behind the video. It's grown a touch past the box, which trims the hairline Safari draws along a video's top edge.
    return (
      <div style={{ ...CLIP, borderRadius: radius, width: inGrid ? '100%' : 'fit-content', maxWidth: '100%', margin: '0 auto' }}>
        <video
          src={`${fileUrl}#t=0.1`}
          poster={poster ? poster.url : undefined}
          controls
          playsInline
          preload="metadata"
          style={{ display: 'block', width: inGrid ? '100%' : 'auto', maxWidth: '100%', height: 'auto', maxHeight: 480, objectFit: 'cover', background: 'transparent', transform: 'scale(1.015)' }}
        />
      </div>
    );
  }
  const embed = embedUrl(v.url);
  if (embed) {
    const vertical = v.shape === 'vertical' || v.shape === 'portrait';
    return (
      <div style={{ position: 'relative', aspectRatio: SHAPE[v.shape] || SHAPE.landscape, width: inGrid ? '100%' : vertical ? 'min(100%, 300px)' : '100%', margin: '0 auto', borderRadius: radius, overflow: 'hidden', background: '#000' }}>
        <iframe src={embed} title="Video" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  return <Empty>{v.url ? 'That link isn’t a YouTube or Vimeo link' : 'Add a video'}</Empty>;
}

function Equip({ refs, extra, names }) {
  const list = [...(refs || []).map((r) => names[r._ref]).filter(Boolean), ...(extra || [])];
  if (!list.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={label}>Equipment used</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{list.map((n, i) => <span key={i} style={chip}>{n}</span>)}</div>
    </div>
  );
}

/** Live preview of a shoot page, updates as you type. */
export function ShootPreview(props) {
  const doc = (props.document && (props.document.displayed || props.document.draft || props.document.published)) || {};
  const client = useClient({ apiVersion: '2024-10-01' });
  const [names, setNames] = useState({});
  const refIds = useMemo(() => collectRefs(doc), [doc]);
  const refKey = refIds.join(',');

  useEffect(() => {
    if (!refIds.length) return;
    let alive = true;
    client
      .fetch('*[_id in $ids]{ _id, name, spec }', { ids: refIds })
      .then((rows) => alive && setNames(Object.fromEntries(rows.map((r) => [r._id, r.name]))))
      .catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, refKey]);

  const meta = [doc.category, doc.year].filter(Boolean).join(' · ') || 'Shoot';
  const sections = doc.sections || [];
  const thumb = doc.thumbnail && doc.thumbnail.asset ? imageFromRef(doc.thumbnail.asset._ref, 700) : null;
  const hasDetails = doc.info || (doc.equipment || []).length || (doc.extraEquipment || []).length;

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#fff', fontFamily: BODY, color: INK }}>
      <div style={{ padding: '10px 16px', background: SOFT, borderBottom: `1px solid ${LINE}`, fontSize: 12, color: MUTED, display: 'flex', justifyContent: 'space-between', gap: 12, position: 'sticky', top: 0, zIndex: 2 }}>
        <span>Live preview that updates as you edit</span>
        <span>{doc.slug && doc.slug.current ? `/work/${doc.slug.current}` : 'Generate a web address to publish'}</span>
      </div>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 28px 64px', display: 'flex', flexDirection: 'column', gap: 36 }}>
        {thumb ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: MUTED }}>
            <img src={thumb.url} alt="" style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 10 }} />
            Thumbnail on the Work page
          </div>
        ) : null}

        <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: BLUE }}>{meta}</span>
          <h1 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 'clamp(32px, 5vw, 60px)', lineHeight: 1, fontWeight: 600, letterSpacing: '-0.035em' }}>{doc.title || 'Untitled shoot'}</h1>
          {doc.client ? <span style={{ fontSize: 17, color: TEXT }}>{doc.client}</span> : null}
        </header>

        {hasDetails ? (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, padding: 28, borderRadius: 22, background: SOFT }}>
            {doc.info ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={label}>Shoot info</span>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{doc.info}</p>
              </div>
            ) : null}
            <Equip refs={doc.equipment} extra={doc.extraEquipment} names={names} />
          </section>
        ) : null}

        {!sections.length ? (
          <Empty ratio="3 / 1">No sections yet. Open the “Page sections” tab and add your first one.</Empty>
        ) : null}

        {sections.map((s) => {
          const heading = s.heading ? <h2 style={{ margin: '0 0 16px', fontFamily: DISPLAY, fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em' }}>{s.heading}</h2> : null;
          switch (s._type) {
            case 'featureVideo':
              return (
                <section key={s._key} style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
                  <div style={{ flex: '999 1 380px', minWidth: 0 }}><Video v={s.video} radius={20} /></div>
                  <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {s.heading ? <h2 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em' }}>{s.heading}</h2> : null}
                    {s.info ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={label}>Shoot info</span>
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: TEXT, whiteSpace: 'pre-line' }}>{s.info}</p>
                      </div>
                    ) : null}
                    <Equip refs={s.equipment} extra={s.extraEquipment} names={names} />
                  </div>
                </section>
              );
            case 'fullVideo':
              return (
                <section key={s._key}>
                  {heading}
                  <Video v={s.video} radius={20} />
                  {s.caption ? <p style={{ margin: '12px 0 0', fontSize: 14, color: TEXT, whiteSpace: 'pre-line' }}>{s.caption}</p> : null}
                </section>
              );
            case 'videoGrid':
              return (
                <section key={s._key}>
                  {heading}
                  {(s.videos || []).length ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, alignItems: 'start' }}>
                      {s.videos.map((v, i) => <div key={v._key || i} style={{ minWidth: 0 }}><Video v={v} inGrid /></div>)}
                    </div>
                  ) : <Empty>Add videos to this grid</Empty>}
                </section>
              );
            case 'gallery': {
              const imgs = (s.images || []).map((im) => (im && im.asset ? imageFromRef(im.asset._ref, 600) : null)).filter(Boolean);
              return (
                <section key={s._key}>
                  {heading}
                  {imgs.length ? (
                    <div style={{ columns: '3 200px', columnGap: 14 }}>
                      {imgs.map((im, i) => <img key={i} src={im.url} alt="" style={{ display: 'block', width: '100%', aspectRatio: `${im.w} / ${im.h}`, objectFit: 'cover', borderRadius: 12, marginBottom: 14, breakInside: 'avoid' }} />)}
                    </div>
                  ) : <Empty>Add photos to this gallery</Empty>}
                </section>
              );
            }
            case 'fullPhoto': {
              const im = s.image && s.image.asset ? imageFromRef(s.image.asset._ref, 1400) : null;
              return (
                <section key={s._key}>
                  {heading}
                  {im ? <img src={im.url} alt="" style={{ display: 'block', width: '100%', borderRadius: 20 }} /> : <Empty ratio="21 / 9">Add a photo</Empty>}
                  {s.caption ? <p style={{ margin: '12px 0 0', fontSize: 14, color: TEXT, whiteSpace: 'pre-line' }}>{s.caption}</p> : null}
                </section>
              );
            }
            case 'textBlock':
              return (
                <section key={s._key} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
                  <h2 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{s.heading || 'Heading'}</h2>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: TEXT, whiteSpace: 'pre-line' }}>{s.text || 'Your paragraph will appear here.'}</p>
                </section>
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
