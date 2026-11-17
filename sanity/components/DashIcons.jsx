/* Line icons that match the website, used across the dashboard. */
const make = (paths, vb = '0 0 24 24') =>
  function DashIcon() {
    return (
      <svg width="1em" height="1em" viewBox={vb} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {paths}
      </svg>
    );
  };

export const LogoMark = function LogoMark() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 38 38" aria-hidden="true">
      <rect width="38" height="38" rx="10" fill="#104de6" />
      <path d="M13 12v14h6" stroke="#fff" strokeWidth="2.6" strokeLinecap="square" fill="none" />
      <circle cx="23.5" cy="19" r="3.6" stroke="#fff" strokeWidth="2.6" fill="none" />
    </svg>
  );
};

export const CameraIcon = make(<><rect x="2.5" y="6.5" width="19" height="13" rx="2.5" /><circle cx="12" cy="13" r="3.5" /><path d="M8 6.5l1.5-2.5h5L16 6.5" /></>);
export const KitIcon = make(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>);
export const MailIcon = make(<><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 6.5l8.5 6.5 8.5-6.5" /></>);
export const InboxIcon = make(<><path d="M3 13l2.5-7.5h13L21 13v5.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V13z" /><path d="M3 13h5l1.5 2.5h5L16 13h5" /></>);
export const CheckIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16.5 9.5" /></>);
export const StackIcon = make(<><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></>);
export const PageIcon = make(<><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>);
export const HomeIcon = make(<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>);
export const StepsIcon = make(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>);
export const SettingsIcon = make(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15H3.5a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.1a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></>);
export const GridIcon = make(<><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></>);
export const UserIcon = make(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>);
export const PhoneIcon = make(<><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" /></>);
export const OverviewIcon = make(<><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></>);
export const PlayIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M10 8.5l5.5 3.5-5.5 3.5z" /></>);
export const PhotoIcon = make(<><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>);
export const StarIcon = make(<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" />);
export const EyeIcon = make(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>);

export const CalendarIcon = make(<><rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /><path d="M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2" /></>);
export const ClockIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></>);
export const PinIcon = make(<><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z" /><circle cx="12" cy="9.8" r="2.4" /></>);
export const UsersIcon = make(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1.2-3.6 3.6-5.4 6.5-5.4s5.3 1.8 6.5 5.4" /><path d="M16 4.8a3.3 3.3 0 0 1 0 6.4M18.2 14.9c1.6.7 2.7 2.4 3.3 5.1" /></>);
export const PoundIcon = make(<><path d="M16.5 6.2A4.2 4.2 0 0 0 8.8 8.5V19H17" /><path d="M6.5 13.2h7" /><path d="M6.5 19h3" /></>);
export const ListIcon = make(<><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>);
export const LinkIcon = make(<><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L11.7 6" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5" /></>);
export const NoteIcon = make(<><path d="M5 3.5h10l4 4V20.5H5z" /><path d="M15 3.5v4h4M8.5 12h7M8.5 16h5" /></>);
export const ChevronLeft = make(<path d="M14.5 5.5 8 12l6.5 6.5" />);
export const ChevronRight = make(<path d="M9.5 5.5 16 12l-6.5 6.5" />);
export const PlusIcon = make(<path d="M12 5v14M5 12h14" />);
export const TruckIcon = make(<><path d="M2.5 6.5h11v10h-11z" /><path d="M13.5 10h4.5l3 3.5v3h-7.5" /><circle cx="6.5" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>);
export const TargetIcon = make(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /></>);
export const TrendIcon = make(<><path d="M3 17.5l5.5-5.5 4 4L21 7.5" /><path d="M15 7.5h6v6" /></>);
