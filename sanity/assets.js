import { dataset, projectId } from './env';

/** image-<id>-<w>x<h>-<ext>  →  CDN url (+ size) */
export function imageFromRef(ref, w = 1200) {
  if (!ref || typeof ref !== 'string') return null;
  const m = ref.match(/^image-([a-zA-Z0-9]+)-(\d+)x(\d+)-(\w+)$/);
  if (!m || !projectId) return null;
  const [, id, width, height, ext] = m;
  return {
    url: `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${width}x${height}.${ext}?w=${w}&auto=format&fit=max`,
    w: Number(width),
    h: Number(height),
  };
}

/** file-<id>-<ext>  →  CDN url */
export function fileFromRef(ref) {
  if (!ref || typeof ref !== 'string') return null;
  const m = ref.match(/^file-([a-zA-Z0-9]+)-(\w+)$/);
  if (!m || !projectId) return null;
  return `https://cdn.sanity.io/files/${projectId}/${dataset}/${m[1]}.${m[2]}`;
}

/** YouTube / Vimeo link → embeddable player url */
export function embedUrl(url) {
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
      if (!id) return null;
      const hash = parts[parts.indexOf(id) + 1];
      return `https://player.vimeo.com/video/${id}?dnt=1${hash && !/^\d+$/.test(hash) ? `&h=${hash}` : ''}`;
    }
  } catch {
    return null;
  }
  return null;
}
