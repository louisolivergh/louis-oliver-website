import { Inter, Sora } from 'next/font/google';
import { Q, sanityFetch } from '@/lib/sanity';
import './globals.css';

const sora = Sora({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sora', display: 'swap' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter', display: 'swap' });

export const revalidate = 30;

/* fit=fill keeps the whole image (never cropped), padding any leftover space transparently */
const iconUrl = (url, size) => (url.toLowerCase().endsWith('.svg') ? url : `${url}?w=${size}&h=${size}&fit=fill&bg=00000000&q=100`);

export async function generateMetadata() {
  const s = (await sanityFetch(Q.settings, {}, {})) || {};
  // An uploaded Favicon wins; otherwise the rounded Louis Oliver icon built into the site is used
  const src = s.faviconUrl || '';
  const icons = src
    ? {
        icon: [
          { url: iconUrl(src, 32), sizes: '32x32' },
          { url: iconUrl(src, 192), sizes: '192x192' },
        ],
        apple: [{ url: iconUrl(src, 180), sizes: '180x180' }],
        shortcut: [iconUrl(src, 32)],
      }
    : {
        icon: [
          { url: '/favicon.ico', sizes: 'any' },
          { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
          { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
        ],
        apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
      };
  return {
    title: { default: 'Louis Oliver — Photo & Video', template: '%s — Louis Oliver' },
    description: 'Premium photo and video production for brands and retailers.',
    icons,
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
