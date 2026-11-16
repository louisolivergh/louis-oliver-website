'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const SHAPE_RATIO = { landscape: '16 / 9', vertical: '9 / 16', square: '1 / 1', portrait: '4 / 5' };

function photoUrl(url, w = 1600) {
  if (!url) return '';
  return `${url}?w=${w}&auto=format&fit=max&q=82`;
}

/** Turn a YouTube / Vimeo link into an embeddable player url. */
function embedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}?rel=0`;
    if (host.endsWith('youtube.com')) {
      const id = u.searchParams.get('v') || (u.pathname.match(/\/(?:shorts|embed|live)\/([^/?]+)/) || [])[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const parts = u.pathname.split('/').filter(Boolean);
      const id = parts.find((p) => /^\d+$/.test(p));
      const hash = parts[parts.indexOf(id) + 1];
      if (!id) return null;
      return `https://player.vimeo.com/video/${id}?dnt=1${hash && !/^\d+$/.test(hash) ? `&h=${hash}` : ''}`;
    }
  } catch {
    return null;
  }
  return null;
}

function Video({ video, title, inGrid = false }) {
  if (!video || !video.url) return null;
  const embed = video.isFile ? null : embedUrl(video.url);
  if (embed) {
    const ratio = SHAPE_RATIO[video.shape] || SHAPE_RATIO.landscape;
    const vertical = video.shape === 'vertical' || video.shape === 'portrait';
    return (
      <div className="vbox" style={{ aspectRatio: ratio, width: inGrid ? '100%' : vertical ? 'min(100%, 460px)' : '100%', margin: '0 auto' }}>
        <iframe src={embed} title={title || 'Video'} loading="lazy" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen />
      </div>
    );
  }
  /* "#t=0.1" makes every browser (including Safari / iPhone) show a frame as the thumbnail */
  const src = video.url.includes('#') ? video.url : `${video.url}#t=0.1`;
  const poster = video.poster ? `${video.poster}?w=1600&auto=format&fit=max&q=80` : undefined;
  return (
    <div className="vbox" style={{ margin: inGrid ? undefined : '0 auto' }}>
      <video src={src} poster={poster} controls playsInline preload="metadata" aria-label={title || 'Video'} />
    </div>
  );
}

function Heading({ children }) {
  return children ? <h2 className="sec-heading">{children}</h2> : null;
}

export default function ShootSections({ sections, cols = 3, title = '' }) {
  /* every photo on the page, in order, for the full-screen viewer */
  const photos = useMemo(() => {
    const out = [];
    sections.forEach((s) => {
      if (s._type === 'gallery') (s.images || []).forEach((im) => im && im.url && out.push(im));
      if (s._type === 'fullPhoto' && s.image && s.image.url) out.push(s.image);
    });
    return out;
  }, [sections]);
  const indexOf = (im) => photos.indexOf(im);

  const [open, setOpen] = useState(-1);
  const close = useCallback(() => setOpen(-1), []);
  const step = useCallback((d) => setOpen((i) => (i < 0 ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    if (open < 0) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close, step]);

  /* only one video plays at a time — starting one pauses the others */
  useEffect(() => {
    const onPlay = (e) => {
      const t = e.target;
      if (!(t instanceof HTMLVideoElement)) return;
      document.querySelectorAll('video').forEach((v) => {
        if (v !== t && !v.paused) v.pause();
      });
    };
    document.addEventListener('play', onPlay, true);
    return () => document.removeEventListener('play', onPlay, true);
  }, []);

  const current = open >= 0 ? photos[open] : null;

  return (
    <div className="shoot-sections">
      {sections.map((s) => {
        switch (s._type) {
          case 'featureVideo':
            return (
              <section key={s._key} className="feature reveal">
                <div className="feature-media vframe"><Video video={s.video} title={s.heading} /></div>
                <div className="feature-copy">
                  {s.heading ? <h2 className="display" style={{ margin: 0, fontSize: 'clamp(26px, 2.6vw, 36px)', lineHeight: 1.1, fontWeight: 600 }}>{s.heading}</h2> : null}
                  {s.info ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span className="label">Shoot info</span>
                      <p className="body pre" style={{ fontSize: 16 }}>{s.info}</p>
                    </div>
                  ) : null}
                  {s.equipmentList.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <span className="label">Equipment used</span>
                      <div className="chips">{s.equipmentList.map((e, i) => <span key={i} className="chip">{e}</span>)}</div>
                    </div>
                  ) : null}
                </div>
              </section>
            );
          case 'fullVideo':
            return (
              <section key={s._key} className="reveal">
                <Heading>{s.heading}</Heading>
                <div className="vframe"><Video video={s.video} title={s.heading} /></div>
                {s.caption ? <p className="body pre" style={{ marginTop: 20, maxWidth: 760, fontSize: 16 }}>{s.caption}</p> : null}
              </section>
            );
          case 'videoGrid':
            return (
              <section key={s._key}>
                <Heading>{s.heading}</Heading>
                <div className="vgrid">
                  {(s.videos || []).map((v, i) => (
                    <div key={i} className="reveal"><Video video={v} title={`${title} video ${i + 1}`} inGrid /></div>
                  ))}
                </div>
              </section>
            );
          case 'gallery':
            return (
              <section key={s._key}>
                <Heading>{s.heading}</Heading>
                <div className={`masonry cols-${cols}`}>
                  {(s.images || []).filter((im) => im && im.url).map((im) => (
                    <figure key={im._key || im.url} className="ph reveal" style={im.w && im.h ? { aspectRatio: `${im.w} / ${im.h}` } : undefined}>
                      <button type="button" onClick={() => setOpen(indexOf(im))} aria-label="View photo full screen">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoUrl(im.url, 1000)} alt={im.alt || `${title} photo`} loading="lazy" width={im.w || undefined} height={im.h || undefined} />
                      </button>
                      <span className="ph-zoom" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 2h4v4M6 14H2v-4M14 2L9 7M2 14l5-5" stroke="currentColor" strokeWidth="1.6" /></svg>
                      </span>
                    </figure>
                  ))}
                </div>
              </section>
            );
          case 'fullPhoto':
            if (!s.image || !s.image.url) return null;
            return (
              <section key={s._key} className="reveal">
                <Heading>{s.heading}</Heading>
                <figure className="full-photo" style={{ margin: 0 }}>
                  <button type="button" onClick={() => setOpen(indexOf(s.image))} aria-label="View photo full screen">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl(s.image.url, 2400)} alt={s.image.alt || `${title} photo`} loading="lazy" width={s.image.w || undefined} height={s.image.h || undefined} />
                  </button>
                </figure>
                {s.caption ? <p className="body pre" style={{ marginTop: 20, maxWidth: 760, fontSize: 16 }}>{s.caption}</p> : null}
              </section>
            );
          case 'textBlock':
            if (!s.heading && !s.text) return null;
            return (
              <section key={s._key} className="text-block reveal">
                <h2 className="display" style={{ margin: 0, fontSize: 'clamp(30px, 3.4vw, 48px)', lineHeight: 1.06, fontWeight: 600 }}>{s.heading}</h2>
                <p className="body pre" style={{ fontSize: 18, lineHeight: 1.75 }}>{s.text}</p>
              </section>
            );
          default:
            return null;
        }
      })}

      {current ? (
        <div className="lb" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={close}>
          <div className="lb-stage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={open} src={photoUrl(current.url, 2400)} alt={current.alt || `${title} photo`} onClick={(e) => e.stopPropagation()} />
          </div>
          <div className="lb-top" onClick={(e) => e.stopPropagation()}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{open + 1} / {photos.length}</span>
            <button type="button" className="lb-btn" onClick={close} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.8" /></svg>
            </button>
          </div>
          {photos.length > 1 ? (
            <>
              <button type="button" className="lb-btn lb-prev" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Previous photo">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 2L4 8l6 6" stroke="currentColor" strokeWidth="1.8" /></svg>
              </button>
              <button type="button" className="lb-btn lb-next" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Next photo">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 2l6 6-6 6" stroke="currentColor" strokeWidth="1.8" /></svg>
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
