'use client';

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { apiVersion, dataset, projectId } from './sanity/env';
import { SINGLETONS, schemaTypes } from './sanity/schemaTypes';
import { theme } from './sanity/theme';
import { TOOL_TYPES, updatesStructure, websiteStructure } from './sanity/structure';
import { Overview } from './sanity/components/Overview';
import { ShootPreview } from './sanity/components/ShootPreview';
import { StudioBrand, StudioLogo } from './sanity/components/StudioLogo';
import { LoField, LoInput } from './sanity/components/FormChrome';
import { StudioLayout } from './sanity/components/UpdatesCanvas';
import { CameraIcon, GridIcon, OverviewIcon } from './sanity/components/DashIcons';

/* Shoots get a live "Preview" tab next to the editor */
const defaultDocumentNode = (S, { schemaType }) => {
  if (schemaType === 'shoot') {
    return S.document().views([S.view.form().title('Edit'), S.view.component(ShootPreview).title('Preview')]);
  }
  return S.document().views([S.view.form()]);
};

/* Top bar: Dashboard · Updates · Website setup */
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
    templates: (templates) => templates.filter(({ schemaType }) => !SINGLETONS.includes(schemaType) && schemaType !== 'enquiry'),
  },
  // the premium editing screens: a header card on every page, plus field hooks for the styles
  form: { components: { input: LoInput, field: LoField } },
  document: {
    actions: (prev, { schemaType }) =>
      SINGLETONS.includes(schemaType)
        ? prev.filter(({ action }) => action && ['publish', 'discardChanges', 'restore'].includes(action))
        : prev,
  },
  plugins: [
    structureTool({ name: 'updates', title: 'Updates', icon: CameraIcon, structure: updatesStructure, defaultDocumentNode }),
    structureTool({ name: 'website', title: 'Website setup', icon: GridIcon, structure: websiteStructure, defaultDocumentNode }),
  ],
  tools: (prev) => [dashboardTool, ...prev.map(keepToOwnTypes)],
  studio: { components: { logo: StudioBrand, layout: StudioLayout } },
});
