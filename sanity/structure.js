import { apiVersion } from './env';
import { SINGLETONS } from './schemaTypes';
import { SINGLETON_TITLES } from './sitePages';
import { SiteMap } from './components/SiteMap';
import { ShootsCalendar } from './components/ShootsCalendar';
import { UpdatesHome } from './components/UpdatesHome';
import { CheckIcon, InboxIcon, MailIcon } from './components/DashIcons';

/* The dashboard's areas (tabs in the top bar):
   - Updates: the things you change often: your portfolio, equipment, enquiries.
   - Shoots: your calendar of booked shoots, private and never on the website.
   - Website setup: the pages themselves, set up once, then rarely touched. */

/* Which kinds of document each area looks after, so a link to one always opens in the right area */
export const TOOL_TYPES = {
  updates: ['shoot', 'equipment', 'enquiry', 'videoItem'],
  shoots: ['booking'],
  website: [...SINGLETONS, 'processStep'],
};

/* Lists show text only: no icon placeholders. Shoots still show their thumbnail when they have one. */
const textList = (S, title) => S.list().title(title).showIcons(false);
const typeList = (S, type, title) => S.documentTypeList(type).title(title).showIcons(false);

const enquiryList = (S, id, title, filter, icon) =>
  S.listItem()
    .id(id)
    .title(title)
    .icon(icon)
    .child(
      S.documentList()
        .apiVersion(apiVersion)
        .title(title)
        .schemaType('enquiry')
        .filter(filter)
        .defaultOrdering([{ field: 'receivedAt', direction: 'desc' }])
        .showIcons(false)
    );

/* ---------- Updates: its own page (portfolio, equipment, enquiries); each list opens beside it ---------- */
const enquiriesList = (S) =>
  textList(S, 'Enquiries').items([
    enquiryList(S, 'toReply', 'To reply', '_type == "enquiry" && replied != true', InboxIcon),
    enquiryList(S, 'replied', 'Replied', '_type == "enquiry" && replied == true', CheckIcon),
    enquiryList(S, 'all', 'All enquiries', '_type == "enquiry"', MailIcon),
  ]);

export const updatesStructure = (S) =>
  S.component(UpdatesHome)
    .id('updates')
    .title('Updates')
    .child((id, options) => {
      if (id === 'shoot') return typeList(S, 'shoot', 'Portfolio');
      if (id === 'equipment') return typeList(S, 'equipment', 'Equipment list');
      if (id === 'enquiries') return enquiriesList(S);
      // a portfolio shoot, piece of kit or enquiry opened from a link elsewhere (e.g. the Dashboard)
      const type = (options && options.params && options.params.type) || 'shoot';
      return S.document().schemaType(type).documentId(String(id).replace(/^__edit__/, ''));
    })
    .canHandleIntent((intent, params) => (intent === 'edit' || intent === 'create') && Boolean(params && TOOL_TYPES.updates.includes(params.type)));

/* ---------- Shoots: the calendar; a shoot opens beside it ---------- */
export const shootsStructure = (S) =>
  S.component(ShootsCalendar)
    .id('calendar')
    .title('Shoots')
    .child((id) => S.document().schemaType('booking').documentId(String(id).replace(/^__edit__/, '')));

/* ---------- Website setup: a visual map of your pages; each opens its editor beside it ---------- */
export const websiteStructure = (S) =>
  S.component(SiteMap)
    .id('site')
    .title('Website setup')
    .child((id, options) => {
      if (id === 'processStep') return typeList(S, 'processStep', 'Process steps');
      if (SINGLETON_TITLES[id]) return S.document().schemaType(id).documentId(id).title(SINGLETON_TITLES[id]);
      // a single process step opened from a link elsewhere
      const type = (options && options.params && options.params.type) || 'processStep';
      return S.document().schemaType(type).documentId(id);
    })
    .canHandleIntent((intent, params) => (intent === 'edit' || intent === 'create') && Boolean(params && TOOL_TYPES.website.includes(params.type)));
