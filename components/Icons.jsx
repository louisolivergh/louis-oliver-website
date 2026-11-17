export function Arrow({ className = 'arrow', size = 14 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function BackArrow({ className } = {}) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M13 7H1M6 2L1 7l5 5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function Plus() {
  return (
    <svg className="plus" width="40" height="40" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 3v16M3 11h16" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function LogoMarkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 3v14h6" stroke="#fff" strokeWidth="2.2" strokeLinecap="square" />
      <circle cx="13.5" cy="10" r="3.5" stroke="#fff" strokeWidth="2.2" />
    </svg>
  );
}

const PATHS = {
  box: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5" stroke="currentColor" strokeWidth="1.5" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" strokeWidth="1.5" />,
  pulse: <path d="M3 12h4l3-8 4 16 3-8h4" stroke="currentColor" strokeWidth="1.5" />,
  grid: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 7h8M7 13v8" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" stroke="currentColor" strokeWidth="1.5" />,
  camera: (
    <>
      <rect x="2.5" y="6.5" width="19" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 6.5l1.5-2.5h5L16 6.5" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  lens: (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </>
  ),
  light: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z" stroke="currentColor" strokeWidth="1.5" />,
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  drone: (
    <>
      <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="19" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="19" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="19" cy="19" r="2" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  screen: (
    <>
      <rect x="2.5" y="4" width="19" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 21h8M12 17v4M7 13l3-3 2.5 2.5L17 8" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  trend: <path d="M2 13l4-4 3 3 7-7M11 5h5v5" stroke="currentColor" strokeWidth="1.8" />,
};

export function Icon({ name, size = 24 }) {
  const vb = name === 'trend' ? '0 0 18 18' : '0 0 24 24';
  return (
    <svg width={size} height={size} viewBox={vb} fill="none" aria-hidden="true">
      {PATHS[name] || PATHS.box}
    </svg>
  );
}

/** Rotating rings used in the blue panels. */
export function Rings({ stroke = 'rgba(255,255,255,0.4)', dot = '#fff', variant = 'hero' }) {
  if (variant === 'panel') {
    return (
      <svg className="panel-rings" viewBox="0 0 400 400" aria-hidden="true">
        <g className="spin"><circle cx="200" cy="200" r="180" fill="none" stroke={stroke} strokeDasharray="2 8" /></g>
        <circle cx="200" cy="200" r="120" fill="none" stroke="rgba(255,255,255,0.25)" />
      </svg>
    );
  }
  return (
    <svg className="rings" viewBox="0 0 600 600" aria-hidden="true">
      <g className="spin"><circle cx="300" cy="300" r="250" fill="none" stroke={stroke} strokeWidth="1" strokeDasharray="2 10" /></g>
      <circle cx="300" cy="300" r="190" fill="none" stroke={stroke} strokeOpacity="0.6" strokeWidth="1" />
      <g className="spin-rev">
        <circle cx="300" cy="300" r="130" fill="none" stroke={stroke} strokeWidth="1.2" strokeDasharray="120 40" />
        <circle cx="430" cy="300" r="6" fill={dot} />
      </g>
      <g className="spin"><circle cx="300" cy="110" r="4" fill={dot} /></g>
      <line x1="0" y1="300" x2="600" y2="300" stroke={stroke} strokeOpacity="0.3" />
      <line x1="300" y1="0" x2="300" y2="600" stroke={stroke} strokeOpacity="0.3" />
    </svg>
  );
}
