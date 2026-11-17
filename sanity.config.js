'use client';

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { apiVersion, dataset, projectId } from './sanity/env';
import { SINGLETONS, schemaTypes } from './sanity/schemaTypes';
import { theme } from './sanity/theme';
import { TOOL_TYPES, shootsStructure, updatesStructure, websiteStructure } from './sanity/structure';
import { clientFromEnquiry } from './sanity/bookingData';
import { ClientSaveAction, CompanySaveAction, SavedAction } from './sanity/components/BookingActions';
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

/* "Otellos" + "Brand video" → "Otellos brand video"; "Ink Heaven" + "Food & drink" → "Ink Heaven food & drink shoot" */
const shootTitle = (who, service) => {
  const what = typeof service === 'string' ? service.trim() : '';
  if (!what) return who;
  const lower = /^[A-Z][a-z]/.test(what) ? what[0].toLowerCase() + what.slice(1) : what;
  return `${who} ${lower}${/\b(shoot|shoots|video|videos|film|films|photography|photos|content|reels?)\b/i.test(what) ? '' : ' shoot'}`;
};

/* A new booked shoot, opened from the calendar (with the day you clicked), from an enquiry
   (with the client's name, contact details, budget and message copied across) or from a client
   on the Clients page (with their name and contact details). */
const bookingTemplate = {
  id: 'booking-new',
  title: 'Booked shoot',
  schemaType: 'booking',
  parameters: [
    { name: 'date', type: 'string' },
    { name: 'enquiryId', type: 'string' },
    { name: 'company', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'email', type: 'string' },
    { name: 'phone', type: 'string' },
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
          if (who) out.title = shootTitle(who, e.service);
        }
      } catch {
        // the details can still be filled in by hand
      }
    } else {
      // booked from a client on the Clients page
      const client = {};
      ['name', 'company', 'email', 'phone'].forEach((k) => {
        if (typeof p[k] === 'string' && p[k].trim()) client[k] = p[k].trim().slice(0, 200);
      });
      if (Object.keys(client).length) {
        out.client = client;
        if (client.company || client.name) out.title = shootTitle(client.company || client.name, '');
      }
    }
    return out;
  },
};

/* A new client, opened from a company on the Clients page ("Add a person"): already in that company */
const clientInCompanyTemplate = {
  id: 'client-in-company',
  title: 'Client at a company',
  schemaType: 'client',
  parameters: [{ name: 'companyId', type: 'string' }],
  value: (params) => {
    const id = params && typeof params.companyId === 'string' ? params.companyId.replace(/^drafts\./, '') : '';
    return id ? { company: { _type: 'reference', _ref: id, _weak: true } } : {};
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
    templates: (templates) => [...templates.filter(({ schemaType }) => !SINGLETONS.includes(schemaType) && schemaType !== 'enquiry'), bookingTemplate, clientInCompanyTemplate],
  },
  // the premium editing screens: a header card on every page, plus field hooks for the styles
  form: { components: { input: LoInput, field: LoField } },
  document: {
    actions: (prev, { schemaType }) => {
      if (SINGLETONS.includes(schemaType)) return prev.filter(({ action }) => action && ['publish', 'discardChanges', 'restore'].includes(action));
      // booked shoots stay private: nothing to publish, they save as you type
      if (schemaType === 'booking') return [SavedAction, ...prev.filter(({ action }) => action && ['duplicate', 'delete', 'restore'].includes(action))];
      // clients and companies stay private too, and only count once you press Save
      if (schemaType === 'client') return [ClientSaveAction, ...prev.filter(({ action }) => action && ['delete', 'restore'].includes(action))];
      if (schemaType === 'company') return [CompanySaveAction, ...prev.filter(({ action }) => action && ['delete', 'restore'].includes(action))];
      return prev;
    },
    // the calendar's own "book a shoot" template doesn't need its own entry in the + menu, and a company
    // is always made along with one of its people (from New client), so it has none either
    newDocumentOptions: (prev) => prev.filter((item) => !['booking-new', 'client-in-company', 'company'].includes(item.templateId)),
  },
  plugins: [
    structureTool({ name: 'updates', title: 'Updates', icon: CameraIcon, structure: updatesStructure, defaultDocumentNode }),
    structureTool({ name: 'shoots', title: 'Shoots', icon: CalendarIcon, structure: shootsStructure, defaultDocumentNode }),
    structureTool({ name: 'website', title: 'Website setup', icon: GridIcon, structure: websiteStructure, defaultDocumentNode }),
  ],
  tools: (prev) => [dashboardTool, ...prev.map(keepToOwnTypes)],
  studio: { components: { logo: StudioBrand, layout: StudioLayout } },
});
