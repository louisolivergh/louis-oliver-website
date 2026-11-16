import Link from 'next/link';
import { logoSrc } from '@/lib/sanity';
import { LogoMarkIcon } from './Icons';

export default function Logo({ settings, footer = false }) {
  const src = footer ? settings.logoFooterUrl : settings.logoUrl;
  return (
    <Link href="/" className="logo" aria-label={`${settings.logoName} home`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="logo-img" src={logoSrc(src, settings.logoHeight)} decoding="async" alt={settings.logoName} style={{ height: settings.logoHeight, borderRadius: Math.round(settings.logoHeight * 0.26) }} />
      ) : (
        <>
          {settings.showMark ? (
            <span className="logo-mark">
              <LogoMarkIcon />
            </span>
          ) : null}
          <span className="logo-word">{settings.logoName}</span>
        </>
      )}
    </Link>
  );
}
