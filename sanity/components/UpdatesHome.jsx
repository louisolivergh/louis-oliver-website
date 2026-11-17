'use client';

/**
 * The Updates tab itself (sanity/structure.js → updatesStructure), in the dashboard's own style:
 *  - nothing open → a full page: your portfolio, equipment list and enquiries as big cards, plus quick adds
 *  - a list open beside it → a slim menu of the same three, with the open one highlighted
 * Each opens Sanity's list for it in the next column. Styles: app/studio/studio.css (".lo-up…", ".lo-cv…").
 */

import { IntentLink } from 'sanity/router';
import { usePaneRouter } from 'sanity/structure';
import { CameraIcon, InboxIcon, KitIcon } from './DashIcons';
import { useUpdatesData } from './UpdatesCanvas';

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M2 7h10M8 3l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Plus = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M7 2.5v9M2.5 7h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export function UpdatesHome(props) {
  const { ChildLink } = usePaneRouter();
  const open = props && props.childItemId ? String(props.childItemId).replace(/^__edit__/, '') : '';
  const { shoots, kit, enquiries, toReply, featured, groups, loading } = useUpdatesData();
  const has = (list) => list.some((d) => d._id === open);
  const active = ['shoot', 'equipment', 'enquiries'].includes(open)
    ? open
    : has(shoots)
      ? 'shoot'
      : has(kit)
        ? 'equipment'
        : has(enquiries)
          ? 'enquiries'
          : '';
  const latest = enquiries[0];
  const who = latest ? [latest.name, latest.company].filter(Boolean).join(' · ') || 'Enquiry' : '';

  const areas = [
    {
      id: 'shoot',
      Icon: CameraIcon,
      title: 'Portfolio',
      count: shoots.length,
      text: shoots.length ? `${featured} featured on your homepage` : 'No shoots yet',
      cta: 'Open portfolio',
      thumbs: shoots.filter((s) => s.thumb).slice(0, 4),
    },
    {
      id: 'equipment',
      Icon: KitIcon,
      title: 'Equipment list',
      count: kit.length,
      text: groups.length ? groups.map((g) => g.title).join(' · ') : 'Nothing added yet',
      cta: 'Open kit list',
    },
    {
      id: 'enquiries',
      Icon: InboxIcon,
      title: 'Enquiries',
      count: toReply.length,
      countLabel: 'to reply',
      text: who ? `Latest: ${who}` : 'None yet',
      cta: 'Open inbox',
      accent: toReply.length > 0,
      inbox: true,
    },
  ];

  /* a list is open beside it: a slim menu */
  if (open) {
    return (
      <nav className="lo-up" data-mode="menu" data-open="" aria-label="Updates">
        <span className="lo-eyebrow">
          <span className="lo-eyebrow-dot" aria-hidden="true" />
          Updates
        </span>
        <div className="lo-up-menu">
          {areas.map((a, i) => (
            <div key={a.id} className="lo-up-group">
              {a.inbox ? <span className="lo-up-label">Inbox</span> : null}
              <ChildLink childId={a.id} className="lo-up-item" data-active={active === a.id ? '' : undefined} data-accent={a.accent ? '' : undefined} style={{ '--i': i }}>
                <span className="lo-up-ic">
                  <a.Icon />
                </span>
                <span className="lo-up-text">
                  <b>{a.title}</b>
                  <small>{loading ? ' ' : a.text}</small>
                </span>
                <span className="lo-up-count" title={a.countLabel ? `${a.count} ${a.countLabel}` : undefined}>
                  {loading ? '…' : a.count}
                </span>
              </ChildLink>
            </div>
          ))}
        </div>
        <div className="lo-up-adds">
          <IntentLink intent="create" params={{ type: 'shoot', template: 'shoot' }} className="lo-up-add">
            <Plus /> Add to portfolio
          </IntentLink>
          <IntentLink intent="create" params={{ type: 'equipment', template: 'equipment' }} className="lo-up-add">
            <Plus /> Add equipment
          </IntentLink>
        </div>
      </nav>
    );
  }

  /* nothing open: the whole page */
  return (
    <div className="lo-up" data-mode="home">
      <div className="lo-cv">
        <header className="lo-cv-hero">
          <span className="lo-eyebrow">
            <span className="lo-eyebrow-dot" aria-hidden="true" />
            Updates
          </span>
          <h1 className="lo-cv-title">Keep your portfolio fresh.</h1>
          <p className="lo-cv-text">Add finished shoots to your portfolio, keep your kit list current and reply to enquiries. Booked shoots live in the Shoots tab.</p>
        </header>

        <div className="lo-cv-cards">
          {areas.map((a, i) => (
            <ChildLink key={a.id} childId={a.id} className="lo-cv-card" data-accent={a.accent ? '' : undefined} style={{ '--i': i }}>
              <span className="lo-cv-card-top">
                <span className="lo-cv-ic">
                  <a.Icon />
                </span>
                <span className="lo-cv-count">{loading ? '…' : a.count}</span>
              </span>
              <span className="lo-cv-card-title">{a.inbox ? (a.count === 1 ? 'Enquiry to reply to' : 'Enquiries to reply to') : a.title}</span>
              <span className="lo-cv-card-text">{loading ? ' ' : a.text}</span>
              {a.thumbs ? (
                <span className="lo-cv-strip">
                  {a.thumbs.map((s) => (
                    <img key={s._id} src={`${s.thumb}?w=160&h=120&fit=crop&auto=format`} alt="" loading="lazy" />
                  ))}
                </span>
              ) : null}
              <span className="lo-cv-card-cta">
                {a.cta} <Arrow />
              </span>
            </ChildLink>
          ))}
        </div>

        <div className="lo-cv-actions">
          <IntentLink intent="create" params={{ type: 'shoot', template: 'shoot' }} className="lo-cv-btn" data-primary="">
            <Plus /> Add to portfolio
          </IntentLink>
          <IntentLink intent="create" params={{ type: 'equipment', template: 'equipment' }} className="lo-cv-btn">
            <Plus /> Add equipment
          </IntentLink>
        </div>
      </div>
    </div>
  );
}
