'use client';

/**
 * The editing screens' extra layer (styled in app/studio/studio.css):
 *  - LoInput: a header card at the top of every page you edit — what it controls, a link to see it
 *    live, and how much of it is filled in.
 *  - LoField: wraps every field so the styles know whether it's filled in (for the little ticks).
 * Everything else about the fields is Sanity's own, so editing works exactly as before.
 */

/* Where each page lives on the website */
const PAGE_URL = {
  homePage: '/',
  servicesPage: '/services',
  aboutPage: '/about',
  processPage: '/process',
  workPage: '/work',
  contactPage: '/contact',
  siteSettings: '/',
};

/* What each kind of page is, in plain words */
const INFO = {
  homePage: { eyebrow: 'Website page', text: 'The first page visitors see — your headline, photo and stats, then a taste of everything else.' },
  servicesPage: { eyebrow: 'Website page', text: 'Your three services, what each one includes, and why clients choose you.' },
  aboutPage: { eyebrow: 'Website page', text: 'Your story, your values and the kit you shoot with.' },
  processPage: { eyebrow: 'Website page', text: 'The headline and questions on your Process page. The steps themselves live under Process steps.' },
  workPage: { eyebrow: 'Website page', title: 'Work page layout', text: 'The heading and layout of your portfolio. Shoots are added under Regular updates → Shoots & portfolio.' },
  contactPage: { eyebrow: 'Website page', text: 'Your contact details, the enquiry form and the questions at the bottom of the page.' },
  siteSettings: { eyebrow: 'Across every page', title: 'Logo & footer', text: 'Your logo, the footer, the call-to-action band, and the icons for the browser tab and this dashboard.' },
  shoot: { eyebrow: 'Shoot', text: 'Fill in the details for its card on the Work page, then build its page under Page sections.' },
  equipment: { eyebrow: 'Equipment', text: 'Shows in the kit list on your About page, and can be ticked on any shoot.' },
  processStep: { eyebrow: 'Process step', text: 'One step in your process. Steps appear in order of their position number.' },
  enquiry: { eyebrow: 'Enquiry', text: 'Sent from the contact form on your website.' },
};

/* ---------- helpers ---------- */

export function isFilled(v) {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number' || typeof v === 'boolean') return true;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') {
    if (v._type === 'slug') return Boolean(v.current);
    if (v._type === 'image' || v._type === 'file' || 'asset' in v) return Boolean(v.asset);
    return Object.keys(v).some((k) => !k.startsWith('_') && isFilled(v[k]));
  }
  return false;
}

function isHidden(hidden, doc, name) {
  if (hidden === true) return true;
  if (typeof hidden === 'function') {
    try {
      return Boolean(hidden({ document: doc, parent: doc, value: doc[name], currentUser: null }));
    } catch {
      return false;
    }
  }
  return false;
}

/* How many of the page's boxes are filled (switches and read-only boxes don't count) */
export function countFields(schemaType, doc) {
  const fields = Array.isArray(schemaType && schemaType.fields) ? schemaType.fields : [];
  let filled = 0;
  let total = 0;
  fields.forEach((f) => {
    const t = f.type || {};
    if (t.jsonType === 'boolean' || t.readOnly === true || isHidden(t.hidden, doc, f.name)) return;
    total += 1;
    if (isFilled(doc[f.name])) filled += 1;
  });
  return { filled, total };
}

function heroTitle(type, info, schemaType, v) {
  switch (type) {
    case 'shoot':
      return v.title || 'New shoot';
    case 'equipment':
      return v.name || 'New piece of kit';
    case 'processStep':
      return v.title || 'New step';
    case 'enquiry':
      return [v.name, v.company].filter(Boolean).join(' — ') || 'Enquiry';
    default:
      return info.title || (schemaType && schemaType.title) || 'Untitled';
  }
}

function liveLink(type, v) {
  if (PAGE_URL[type]) return { href: PAGE_URL[type], label: 'View live page' };
  if (type === 'shoot') return v.slug && v.slug.current ? { href: `/work/${v.slug.current}`, label: 'View live shoot' } : null;
  if (type === 'processStep') return { href: '/process', label: 'View on website' };
  if (type === 'equipment') return { href: '/about', label: 'View on website' };
  if (type === 'enquiry' && v.email) {
    return { href: `mailto:${v.email}?subject=${encodeURIComponent('Re: your enquiry')}`, label: 'Reply by email', mail: true };
  }
  return null;
}

function kindOf(t) {
  const names = [];
  for (let x = t; x && names.length < 8; x = x.type) names.push(x.name);
  if (names.includes('image')) return 'image';
  if (names.includes('file')) return 'file';
  if (names.includes('slug')) return 'slug';
  if (t && t.jsonType === 'boolean') return 'boolean';
  if (t && t.jsonType === 'array') return 'array';
  if (t && t.jsonType === 'object') return 'object';
  return 'text';
}

const ArrowUpRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M4 10 10 4M5.2 4H10v4.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---------- the header card ---------- */

function DocHero({ schemaType, value }) {
  const type = schemaType && schemaType.name;
  const info = INFO[type] || { eyebrow: (schemaType && schemaType.title) || 'Document' };
  const v = value && typeof value === 'object' ? value : {};
  const title = heroTitle(type, info, schemaType, v);
  const link = liveLink(type, v);
  const isEnquiry = type === 'enquiry';
  const { filled, total } = isEnquiry ? { filled: 0, total: 0 } : countFields(schemaType, v);
  const done = total > 0 && filled === total;
  const received = isEnquiry && v.receivedAt
    ? new Date(v.receivedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  return (
    <header className="lo-hero">
      <span className="lo-hero-rings" aria-hidden="true" />
      <div className="lo-hero-row">
        <span className="lo-eyebrow">
          <span className="lo-eyebrow-dot" aria-hidden="true" />
          {info.eyebrow}
        </span>
        {link ? (
          <a className="lo-live" href={link.href} {...(link.mail ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
            {link.label}
            <ArrowUpRight />
          </a>
        ) : null}
      </div>
      <h1 className="lo-hero-title">{title}</h1>
      {info.text ? <p className="lo-hero-text">{info.text}</p> : null}

      {isEnquiry ? (
        <div className="lo-hero-status" data-done={v.replied ? '' : undefined}>
          <span className="lo-status-dot" aria-hidden="true" />
          {v.replied ? 'Replied' : 'Waiting for your reply'}
          {received ? <span className="lo-status-when">· {received}</span> : null}
        </div>
      ) : total > 0 ? (
        <div className="lo-progress" data-done={done ? '' : undefined}>
          <div className="lo-progress-track">
            <span className="lo-progress-fill" style={{ transform: `scaleX(${filled / total})` }} />
          </div>
          <span className="lo-progress-label">
            {done ? (
              <>All {total} filled</>
            ) : (
              <>
                <b>{filled}</b> of {total} filled
              </>
            )}
          </span>
        </div>
      ) : null}

      {PAGE_URL[type] ? (
        <p className="lo-hero-tip">
          <span className="lo-tip-dot" aria-hidden="true" />
          Faint text in an empty box is what your website shows right now.
        </p>
      ) : null}
    </header>
  );
}

/* ---------- form components (registered in sanity.config.js) ---------- */

export function LoInput(props) {
  const isRoot = props.id === 'root' || (Array.isArray(props.path) && props.path.length === 0);
  if (!isRoot) return props.renderDefault(props);
  return (
    <div className="lo-doc">
      <DocHero schemaType={props.schemaType} value={props.value} />
      {props.renderDefault(props)}
    </div>
  );
}

export function LoField(props) {
  const kind = kindOf(props.schemaType);
  const top = Array.isArray(props.path) && props.path.length === 1;
  const filled = kind !== 'boolean' && isFilled(props.value);
  return (
    <div
      className="lo-field"
      data-lo-kind={kind}
      data-lo-top={top ? '' : undefined}
      data-lo-filled={filled ? '' : undefined}
    >
      {props.renderDefault(props)}
    </div>
  );
}
