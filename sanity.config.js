'use client';

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { apiVersion, dataset, projectId } from './sanity/env';
import { SINGLETONS, schemaTypes } from './sanity/schemaTypes';
import { theme } from './sanity/theme';
import { TOOL_TYPES, shootsStructure, updatesStructure, websiteStructure } from './sanity/structure';
import { clientFromEnquiry } from './sanity/bookingData';
import { SavedAction } from './sanity/components/BookingActions';
import { Overview } from './sanity/components/Overview';
import { ShootPreview } from './sanity/components/ShootPreview';
import { StudioBrand, StudioLogo } from './sanity/components/StudioLogo';
import { LoField, LoInput } from './sanity/components/FormChrome';
import { StudioLayout } from './sanity/components/UpdatesCanvas';
import { CalendarIcon, CameraIcon, GridIcon, OverviewIcon } from './sanity/components/DashIcons';

/* Shoots get a live "Preview" tab next to the editor */
const defaultDocumentNode = (S, { schemaType }) => {
  if (schemaType === 'shoot') {
    return S.document().views([S.view.form().title('Edit'), S.view.component(ShootPreview).title('Preview')]);
  }
  return S.document().views([S.view.form()]);
};

/* A new booked shoot — opened from the calendar (with the day you clicked) or from an enquiry
   (with the client's name, contact details, budget and message copied across). */
const bookingTemplate = {
  id: 'booking-new',
  title: 'Booked shoot',
  schemaType: 'booking',
  parameters: [
    { name: 'date', type: 'string' },
    { name: 'enquiryId', type: 'string' },
  ],
  value: async (params, context) => {
    const p = params || {};
    const out = { status: 'pencilled' };
    if (typeof p.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.date)) out.date = p.date;
    if (p.enquiryId && context && typeof context.getClient === 'function') {
      try {
        const id = String(p.enquiryId).replace(/^drafts\./, '');
        const e = await context
          .getClient({ apiVersion })
          .fetch('*[_id in [$id, "drafts." + $id]] | order(_updatedAt desc)[0]{ name, company, email, phone, service, budget, details, receivedAt }', { id });
        if (e) {
          out.client = clientFromEnquiry(id, e);
          const who = e.company || e.name;
          if (who) out.title = e.service ? `${who} — ${e.service}` : who;
        }
      } catch {
        // the details can still be filled in by hand
      }
    }
    return out;
  },
};

/* Top bar: Dashboard · Updates · Shoots · Website setup */
const dashboardTool = { name: 'overview', title: 'Dashboard', icon: OverviewIcon, component: Overview };

/* A link to edit something (e.g. from the Dashboard) opens in the area that looks after it */
const keepToOwnTypes = (tool) => {
  const types = TOOL_TYPES[tool.name];
  if (!types || typeof tool.canHandleIntent !== 'function') return tool;
  const canHandle = tool.canHandleIntent;
  return {
    ...tool,
    canHandleIntent: (intent, params, payload) => {
      const type = params && params.type;
      if (type && !types.includes(type)) return false;
      return canHandle(intent, params, payload);
    },
  };
};

export default defineConfig({
  name: 'louis-oliver',
  title: 'Louis Oliver',
  icon: StudioLogo,
  basePath: '/studio',
  projectId: projectId || 'missing-project-id',
  dataset,
  apiVersion,
  theme,
  schema: {
    types: schemaTypes,
    templates: (templates) => [...templates.filter(({ schemaType }) => !SINGLETONS.includes(schemaType) && schemaType !== 'enquiry'), bookingTemplate],
  },
  // the premium editing screens: a header card on every page, plus field hooks for the styles
  form: { components: { input: LoInput, field: LoField } },
  document: {
    actions: (prev, { schemaType }) => {
      if (SINGLETONS.includes(schemaType)) return prev.filter(({ action }) => action && ['publish', 'discardChanges', 'restore'].includes(action));
      // booked shoots stay private: nothing to publish, they save as you type
      if (schemaType === 'booking') return [SavedAction, ...prev.filter(({ action }) => action && ['duplicate', 'delete', 'restore'].includes(action))];
      return prev;
    },
    // the calendar's own "book a shoot" template doesn't need its own entry in the + menu
    newDocumentOptions: (prev) => prev.filter((item) => item.templateId !== 'booking-new'),
  },
  plugins: [
    structureTool({ name: 'updates', title: 'Updates', icon: CameraIcon, structure: updatesStructure, defaultDocumentNode }),
    structureTool({ name: 'shoots', title: 'Shoots', icon: CalendarIcon, structure: shootsStructure, defaultDocumentNode }),
    structureTool({ name: 'website', title: 'Website setup', icon: GridIcon, structure: websiteStructure, defaultDocumentNode }),
  ],
  tools: (prev) => [dashboardTool, ...prev.map(keepToOwnTypes)],
  studio: { components: { logo: StudioBrand, layout: StudioLayout } },
});
