'use client';

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { apiVersion, dataset, projectId } from './sanity/env';
import { SINGLETONS, schemaTypes } from './sanity/schemaTypes';
import { theme } from './sanity/theme';
import { Overview } from './sanity/components/Overview';
import { ShootPreview } from './sanity/components/ShootPreview';
import { StudioBrand, StudioLogo } from './sanity/components/StudioLogo';
import { LoField, LoInput } from './sanity/components/FormChrome';
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

/* a divider with a small blue label beside its line (styled in app/studio/studio.css) */
const labelledDivider = (S, title) => {
  const d = S.divider();
  return typeof d.title === 'function' ? d.title(title) : d;
};

/* Lists show text only: no icon placeholders. Shoots still show their thumbnail when they have one. */
const textList = (S, title) => S.list().title(title).showIcons(false);
const typeList = (S, type, title) => S.documentTypeList(type).title(title).showIcons(false);

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
        .showIcons(false)
    );

const structure = (S) =>
  textList(S, 'Louis Oliver').items([
    S.listItem()
      .title('Regular updates')
      .id('regular')
      .icon(CameraIcon)
      .child(
        textList(S, 'Regular updates').items([
          S.documentTypeListItem('shoot').id('shoot').title('Shoots & portfolio').icon(CameraIcon).child(typeList(S, 'shoot', 'Shoots & portfolio')),
          S.documentTypeListItem('equipment').id('equipment').title('Equipment list').icon(KitIcon).child(typeList(S, 'equipment', 'Equipment list')),
          labelledDivider(S, 'Inbox'),
          S.listItem()
            .id('enquiries')
            .title('Enquiries')
            .icon(InboxIcon)
            .child(
              textList(S, 'Enquiries').items([
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
        textList(S, 'Website pages & setup').items([
          singleton(S, 'homePage', 'Home page', HomeIcon),
          singleton(S, 'servicesPage', 'Services page', StarIcon),
          singleton(S, 'aboutPage', 'About page', PageIcon),
          singleton(S, 'processPage', 'Process page', StepsIcon),
          S.documentTypeListItem('processStep').title('Process steps').icon(StepsIcon).child(typeList(S, 'processStep', 'Process steps')),
          singleton(S, 'workPage', 'Work page layout', CameraIcon),
          singleton(S, 'contactPage', 'Contact page', MailIcon),
          labelledDivider(S, 'Brand'),
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
  plugins: [structureTool({ title: 'Content', structure, defaultDocumentNode })],
  tools: (prev) => [overviewTool, ...prev],
  studio: { components: { logo: StudioBrand } },
});
