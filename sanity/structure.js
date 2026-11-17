import { apiVersion } from './env';
import { SINGLETONS } from './schemaTypes';
import { SINGLETON_TITLES } from './sitePages';
import { SiteMap } from './components/SiteMap';
import { ShootsCalendar } from './components/ShootsCalendar';
import { UpdatesHome } from './components/UpdatesHome';
import { InboxPane, KitPane, PortfolioPane } from './components/UpdatesCanvas';

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
const typeList = (S, type, title) => S.documentTypeList(type).title(title).showIcons(false);

/* ---------- Updates: a themed menu, and each area (portfolio, kit, inbox) as a themed page beside it.
   Anything you open (a shoot, a piece of kit, an enquiry) opens in place of that page. ---------- */

/* what kind of document an id is (links into Updates don't always say) */
async function typeOf(S, context, id) {
  try {
    const getClient = (context && context.getClient) || (S.context && S.context.getClient);
    if (!getClient) return '';
    const t = await getClient({ apiVersion }).fetch('*[_id in [$id, $draft]][0]._type', { id, draft: `drafts.${id}` });
    return typeof t === 'string' ? t : '';
  } catch {
    return '';
  }
}

export const updatesStructure = (S, context) =>
  S.component(UpdatesHome)
    .id('updates')
    .title('Updates')
    .child(async (id, options) => {
      if (id === 'shoot') return S.component(PortfolioPane).id('shoot').title('Portfolio');
      if (id === 'equipment') return S.component(KitPane).id('equipment').title('Equipment list');
      if (id === 'enquiries') return S.component(InboxPane).id('enquiries').title('Enquiries');
      // a portfolio shoot, piece of kit or enquiry (opened from one of the pages above, or from the Dashboard)
      const docId = String(id).replace(/^__edit__/, '');
      const p = (options && options.params) || {};
      const types = TOOL_TYPES.updates;
      let type = types.includes(p.type) ? p.type : types.includes(p.template) ? p.template : '';
      if (!type) type = await typeOf(S, context, docId);
      return S.document()
        .schemaType(types.includes(type) ? type : 'shoot')
        .documentId(docId);
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
