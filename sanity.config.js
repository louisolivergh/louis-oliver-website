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
      S.listItem()
        .title('Regular updates')
        .id('regular')
        .child(
          S.list()
            .title('Regular updates')
            .items([
              S.documentTypeListItem('shoot').title('Shoots & portfolio (Work page)'),
              S.documentTypeListItem('equipment').title('Equipment list'),
              S.divider(),
              S.documentTypeListItem('enquiry').title('Enquiries (from the contact form)'),
            ])
        ),
      S.listItem()
        .title('Website pages & setup')
        .id('website')
        .child(
          S.list()
            .title('Website pages & setup')
            .items([
              singleton(S, 'homePage', 'Home page'),
              singleton(S, 'servicesPage', 'Services page'),
              singleton(S, 'aboutPage', 'About page'),
              singleton(S, 'processPage', 'Process page'),
              S.documentTypeListItem('processStep').title('Process steps'),
              singleton(S, 'workPage', 'Work page (headline & layout)'),
              singleton(S, 'contactPage', 'Contact page'),
              S.divider(),
              singleton(S, 'siteSettings', 'Site settings (logo, footer)'),
            ])
        ),
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
