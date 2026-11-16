import { Q, pick, sanityFetch } from './sanity';

export const NAV = [
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Process', href: '/process' },
  { label: 'Work', href: '/work' },
  { label: 'Contact', href: '/contact' },
];

export async function getSettings() {
  const s = (await sanityFetch(Q.settings, {}, {})) || {};
  return {
    logoName: pick(s.logoName, 'Louis Oliver'),
    showMark: s.showMark !== false,
    logoUrl: s.logoUrl || '',
    logoFooterUrl: s.logoFooterUrl || s.logoUrl || '',
    logoHeight: s.logoHeight || 40,
    footerText: pick(s.footerText, '[One-line company description for the footer.]'),
    socials: pick(s.socials, [
      { label: '[LinkedIn]', url: 'https://www.linkedin.com' },
      { label: '[Instagram]', url: 'https://www.instagram.com' },
    ]),
    ctaTitle: pick(s.ctaTitle, '[Ready to work together?]'),
    ctaText: pick(s.ctaText, '[A short line inviting the visitor to get in touch.]'),
    ctaButton: pick(s.ctaButton, '[Start a project]'),
  };
}

/** Two-digit step numbers: 1 → "01" */
export const two = (n) => String(n).padStart(2, '0');
