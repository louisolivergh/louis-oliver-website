'use client';

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { apiVersion, dataset, projectId } from './sanity/env';
import { SINGLETONS, schemaTypes } from './sanity/schemaTypes';
import { theme } from './sanity/theme';
import { Overview } from './sanity/components/Overview';
import { ShootPreview } from './sanity/components/ShootPreview';
import {
  CameraIcon,
  CheckIcon,
  HomeIcon,
  InboxIcon,
  KitIcon,
  LogoMark,
  MailIcon,
  OverviewIcon,
  PageIcon,
  SettingsIcon,
  StarIcon,
  StepsIcon,
  GridIcon,
} from './sanity/components/DashIcons';

const singleton = (S, id, title, icon) =>
  S.listItem().title(title).id(id).icon(icon).child(S.document().schemaType(id).documentId(id).title(title));

const enquiryList = (S, title, filter, icon) =>
  S.listItem()
    .title(title)
    .icon(icon)
    .child(
      S.documentList()
        .apiVersion(apiVersion)
        .title(title)
        .schemaType('enquiry')
        .filter(filter)
        .defaultOrdering([{ field: 'receivedAt', direction: 'desc' }])
    );

const structure = (S) =>
  S.list()
    .title('Louis Oliver')
    .items([
      S.listItem()
        .title('Regular updates')
        .id('regular')
        .icon(CameraIcon)
        .child(
          S.list()
            .title('Regular updates')
            .items([
              S.documentTypeListItem('shoot').title('Shoots & portfolio').icon(CameraIcon),
              S.documentTypeListItem('equipment').title('Equipment list').icon(KitIcon),
              S.divider(),
              S.listItem()
                .title('Enquiries')
                .icon(InboxIcon)
                .child(
                  S.list()
                    .title('Enquiries')
                    .items([
                      enquiryList(S, 'To reply', '_type == "enquiry" && replied != true', InboxIcon),
                      enquiryList(S, 'Replied', '_type == "enquiry" && replied == true', CheckIcon),
                      enquiryList(S, 'All enquiries', '_type == "enquiry"', MailIcon),
                    ])
                ),
            ])
        ),
      S.listItem()
        .title('Website pages & setup')
        .id('website')
        .icon(GridIcon)
        .child(
          S.list()
            .title('Website pages & setup')
            .items([
              singleton(S, 'homePage', 'Home page', HomeIcon),
              singleton(S, 'servicesPage', 'Services page', StarIcon),
              singleton(S, 'aboutPage', 'About page', PageIcon),
              singleton(S, 'processPage', 'Process page', StepsIcon),
              S.documentTypeListItem('processStep').title('Process steps').icon(StepsIcon),
              singleton(S, 'workPage', 'Work page layout', CameraIcon),
              singleton(S, 'contactPage', 'Contact page', MailIcon),
              S.divider(),
              singleton(S, 'siteSettings', 'Logo & footer', SettingsIcon),
            ])
        ),
    ]);

/* Shoots get a live "Preview" tab next to the editor */
const defaultDocumentNode = (S, { schemaType }) => {
  if (schemaType === 'shoot') {
    return S.document().views([S.view.form().title('Edit'), S.view.component(ShootPreview).title('Preview')]);
  }
  return S.document().views([S.view.form()]);
};

const overviewTool = { name: 'overview', title: 'Overview', icon: OverviewIcon, component: Overview };

export default defineConfig({
  name: 'louis-oliver',
  title: 'Louis Oliver',
  icon: LogoMark,
  basePath: '/studio',
  projectId: projectId || 'missing-project-id',
  dataset,
  apiVersion,
  theme,
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
  plugins: [structureTool({ title: 'Content', structure, defaultDocumentNode })],
  tools: (prev) => [overviewTool, ...prev],
});
