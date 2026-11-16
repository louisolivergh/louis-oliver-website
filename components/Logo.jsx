import Link from 'next/link';
import { LogoMarkIcon } from './Icons';

export default function Logo({ settings, footer = false }) {
  const src = footer ? settings.logoFooterUrl : settings.logoUrl;
  return (
    <Link href="/" className="logo" aria-label={`${settings.logoName} home`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="logo-img" src={`${src}?h=${settings.logoHeight * 2}&auto=format`} alt={settings.logoName} style={{ height: settings.logoHeight }} />
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
