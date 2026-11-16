import { createClient } from 'next-sanity';
import { apiVersion, dataset, isConfigured, projectId } from '@/sanity/env';

let client = null;
if (isConfigured) {
  try {
    client = createClient({ projectId, dataset, apiVersion, useCdn: false });
  } catch (err) {
    console.error('Sanity client could not be created — check NEXT_PUBLIC_SANITY_PROJECT_ID', err);
    client = null;
  }
}

/** How often pages pick up dashboard changes (seconds). */
export const REVALIDATE = 30;

export async function sanityFetch(query, params = {}, fallback = null) {
  if (!client) return fallback;
  try {
    const res = await client.fetch(query, params, { next: { revalidate: REVALIDATE } });
    return res ?? fallback;
  } catch (err) {
    console.error('Sanity fetch failed', err);
    return fallback;
  }
}

/** Sanity image CDN url with sensible defaults. */
export function img(url, w = 1600) {
  if (!url) return '';
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}w=${w}&auto=format&fit=max&q=82`;
}

/** object-position from a Sanity hotspot */
export function focus(hotspot) {
  if (!hotspot || typeof hotspot.x !== 'number') return 'center';
  return `${Math.round(hotspot.x * 100)}% ${Math.round(hotspot.y * 100)}%`;
}

/** Use the dashboard value when filled in, otherwise the placeholder. */
export function pick(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' && !value.trim()) return fallback;
  if (Array.isArray(value) && !value.length) return fallback;
  return value;
}

/* ---------- queries ---------- */

const VIDEO = `{ "url": coalesce(file.asset->url, url), "isFile": defined(file.asset), shape, "poster": poster.asset->url }`;
const EQUIP = `"equipment": array::compact(equipment[]->name), extraEquipment`;

export const Q = {
  settings: `*[_id == "siteSettings"][0]{ ..., "logoUrl": logo.asset->url, "logoFooterUrl": logoFooter.asset->url }`,
  home: `*[_id == "homePage"][0]{ ..., "heroPhotoUrl": heroPhoto.asset->url, "heroHotspot": heroPhoto.hotspot, "clientLogos": clientLogos[]{ name, show, "logoUrl": logo.asset->url } }`,
  services: `*[_id == "servicesPage"][0]`,
  about: `*[_id == "aboutPage"][0]{ ..., "photoUrl": photo.asset->url, "photoHotspot": photo.hotspot }`,
  process: `*[_id == "processPage"][0]`,
  work: `*[_id == "workPage"][0]`,
  contact: `*[_id == "contactPage"][0]`,
  steps: `*[_type == "processStep" && !(_id in path("drafts.**"))] | order(order asc){ _id, title, duration, description, outputs }`,
  equipment: `*[_type == "equipment" && !(_id in path("drafts.**"))] | order(order asc, name asc){ _id, name, spec, category }`,
  featured: `*[_type == "shoot" && featured == true && defined(slug.current)] | order(date desc)[0...4]{ title, client, category, "slug": slug.current, "review": testimonial{ quote, name, role, "photo": photo.asset->url } }`,
  reviews: `*[_type == "shoot" && defined(slug.current) && defined(testimonial.quote) && testimonial.quote != ""] | order(date desc)[0...12]{ title, "slug": slug.current, "review": testimonial{ quote, name, role, "photo": photo.asset->url } }`,
  shoots: `*[_type == "shoot" && defined(slug.current)] | order(date desc, _createdAt desc){
    _id, title, client, category, year, "slug": slug.current,
    "thumbUrl": thumbnail.asset->url, "thumbHotspot": thumbnail.hotspot,
    "count": coalesce(count(sections[_type == "gallery"].images[]), 0) + coalesce(count(sections[_type == "videoGrid"].videos[]), 0) + coalesce(count(sections[_type in ["featureVideo", "fullVideo", "fullPhoto"]]), 0)
  }`,
  shoot: `*[_type == "shoot" && slug.current == $slug][0]{
    _id, title, client, category, year, info, ${EQUIP},
    "slug": slug.current,
    sections[]{
      _key, _type, heading, info, caption, text, ${EQUIP},
      video ${VIDEO},
      videos[] ${VIDEO},
      "image": image{ alt, "url": asset->url, "w": asset->metadata.dimensions.width, "h": asset->metadata.dimensions.height },
      "images": images[]{ _key, alt, "url": asset->url, "w": asset->metadata.dimensions.width, "h": asset->metadata.dimensions.height }
    }
  }`,
  slugs: `*[_type == "shoot" && defined(slug.current)].slug.current`,
};
