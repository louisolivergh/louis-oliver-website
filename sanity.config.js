'use client';

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { apiVersion, dataset, projectId } from './sanity/env';
import { SINGLETONS, schemaTypes } from './sanity/schemaTypes';

const singleton = (S, id, title) =>
  S.listItem().title(title).id(id).child(S.document().schemaType(id).documentId(id).title(title));

const structure = (S) =>
  S.list()
    .title('Louis Oliver')
    .items([
      S.documentTypeListItem('shoot').title('Shoots (Work page)'),
      S.documentTypeListItem('equipment').title('Equipment'),
      S.documentTypeListItem('processStep').title('Process steps'),
      S.divider(),
      singleton(S, 'homePage', 'Home page'),
      singleton(S, 'servicesPage', 'Services page'),
      singleton(S, 'aboutPage', 'About page'),
      singleton(S, 'processPage', 'Process page'),
      singleton(S, 'workPage', 'Work page'),
      singleton(S, 'contactPage', 'Contact page'),
      singleton(S, 'siteSettings', 'Site settings (logo, footer)'),
      S.divider(),
      S.documentTypeListItem('enquiry').title('Enquiries (from the contact form)'),
    ]);

export default defineConfig({
  name: 'louis-oliver',
  title: 'Louis Oliver',
  basePath: '/studio',
  projectId: projectId || 'missing-project-id',
  dataset,
  apiVersion,
  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter(({ schemaType }) => !SINGLETONS.includes(schemaType) && schemaType !== 'enquiry'),
  },
  document: {
    actions: (prev, { schemaType }) =>
      SINGLETONS.includes(schemaType)
        ? prev.filter(({ action }) => action && ['publish', 'discardChanges', 'restore'].includes(action))
        : prev,
  },
  plugins: [structureTool({ structure })],
});
