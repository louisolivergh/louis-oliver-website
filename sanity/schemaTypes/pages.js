import { defineArrayMember, defineField, defineType } from 'sanity';

/* Small helpers so every text box is quick to define. Empty fields fall back to placeholder text on the site. */
const s = (name, title, extra = {}) => defineField({ name, title, type: 'string', ...extra });
const t = (name, title, rows = 3, extra = {}) => defineField({ name, title, type: 'text', rows, ...extra });
const img = (name, title, extra = {}) => defineField({ name, title, type: 'image', options: { hotspot: true }, ...extra });

const show = (title = 'Show on website') => defineField({ name: 'show', title, type: 'boolean', initialValue: true });

const stat = defineArrayMember({
  type: 'object',
  name: 'stat',
  fields: [s('value', 'Number'), s('label', 'Label'), show()],
  preview: {
    select: { value: 'value', label: 'label', show: 'show' },
    prepare: ({ value, label, show: on }) => ({ title: `${on === false ? '◌ Hidden — ' : ''}${value || 'Stat'}`, subtitle: label }),
  },
});

const clientLogo = defineArrayMember({
  type: 'object',
  name: 'clientLogo',
  title: 'Client',
  fields: [
    defineField({ name: 'logo', title: 'Logo', type: 'image', description: 'A PNG or SVG with a transparent background works best.' }),
    s('name', 'Client name', { description: 'Shown if there’s no logo, and read out to screen readers.' }),
    show(),
  ],
  preview: {
    select: { name: 'name', media: 'logo', show: 'show' },
    prepare: ({ name, media, show: on }) => ({ title: `${on === false ? '◌ Hidden — ' : ''}${name || 'Client'}`, media }),
  },
});

const faq = defineArrayMember({
  type: 'object',
  name: 'faq',
  fields: [s('question', 'Question'), t('answer', 'Answer', 4)],
  preview: { select: { title: 'question' } },
});

/* ---------- Site settings ---------- */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    s('logoName', 'Logo text', { initialValue: 'Louis Oliver' }),
    defineField({ name: 'showMark', title: 'Show the small blue “LO” square next to the logo text', type: 'boolean', initialValue: true }),
    defineField({ name: 'logo', title: 'Logo image', type: 'image', description: 'Replaces the logo text when added.' }),
    defineField({ name: 'logoFooter', title: 'Footer logo image', type: 'image', description: 'Optional — e.g. a white version for the dark footer.' }),
    defineField({
      name: 'dashboardLogo',
      title: 'Dashboard logo',
      type: 'image',
      description: 'Shown in the top-left of this dashboard. A square image works best. If empty, your logo image is used, then the blue LO mark.',
    }),
    defineField({
      name: 'favicon',
      title: 'Favicon',
      type: 'image',
      description: 'The small icon in the browser tab. Use a square image, ideally 512 × 512 px (PNG or SVG). Optional — the rounded Louis Oliver icon is already built in. Upload here only to replace it.',
    }),
    defineField({ name: 'logoHeight', title: 'Logo height', type: 'number', initialValue: 40, description: 'In pixels. 40 is a good starting point.' }),
    t('footerText', 'Footer description', 2),
    defineField({
      name: 'socials',
      title: 'Social links',
      type: 'array',
      of: [defineArrayMember({ type: 'object', name: 'social', fields: [s('label', 'Name'), defineField({ name: 'url', title: 'Link', type: 'url' })], preview: { select: { title: 'label', subtitle: 'url' } } })],
    }),
    s('ctaTitle', 'Bottom call-to-action heading'),
    t('ctaText', 'Bottom call-to-action text', 2),
    s('ctaButton', 'Bottom call-to-action button'),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
});

/* ---------- Home ---------- */
export const homePage = defineType({
  name: 'homePage',
  title: 'Home page',
  type: 'document',
  groups: [
    { name: 'hero', title: 'Top section', default: true },
    { name: 'rest', title: 'Other sections' },
  ],
  fields: [
    img('heroPhoto', 'Your photo', { group: 'hero' }),
    s('heroTagline', 'Small tagline above the headline', { group: 'hero' }),
    s('heroLine1', 'Headline — line 1', { group: 'hero' }),
    s('heroLine2', 'Headline — line 2', { group: 'hero' }),
    s('heroLine3', 'Headline — line 3', { group: 'hero', description: 'Shown in blue.' }),
    t('heroText', 'Text under the headline', 3, { group: 'hero' }),
    s('primaryButton', 'Main button text', { group: 'hero' }),
    s('secondaryButton', 'Second button text', { group: 'hero' }),
    defineField({ name: 'heroStats', title: 'Stats under the buttons', type: 'array', of: [stat], group: 'hero', validation: (r) => r.max(3), description: 'Untick “Show on website” to hide one. If all are hidden, the row disappears.' }),
    defineField({ name: 'showMetric', title: 'Show the white floating card', type: 'boolean', initialValue: true, group: 'hero' }),
    s('metricLabel', 'Floating card — label', { group: 'hero', hidden: ({ document }) => document && document.showMetric === false }),
    s('metricValue', 'Floating card — number', { group: 'hero', hidden: ({ document }) => document && document.showMetric === false }),
    defineField({ name: 'showStatus', title: 'Show the floating status line', type: 'boolean', initialValue: true, group: 'hero' }),
    s('statusLine', 'Floating status line', { group: 'hero', hidden: ({ document }) => document && document.showStatus === false }),

    defineField({ name: 'showClients', title: 'Show the client logo strip', type: 'boolean', initialValue: true, group: 'rest' }),
    s('clientsTitle', 'Client strip heading', { group: 'rest', hidden: ({ document }) => document && document.showClients === false }),
    defineField({
      name: 'clientLogos',
      title: 'Client logos',
      type: 'array',
      of: [clientLogo],
      group: 'rest',
      description: 'Add each client’s logo. Untick “Show on website” to hide one. If all are hidden, the strip disappears.',
      hidden: ({ document }) => document && document.showClients === false,
    }),
    defineField({ name: 'clients', title: 'Client names (old)', type: 'array', of: [defineArrayMember({ type: 'string' })], options: { layout: 'tags' }, group: 'rest', hidden: true }),
    s('servicesTitle', 'Services heading', { group: 'rest' }),
    t('servicesIntro', 'Services intro', 2, { group: 'rest' }),
    s('aboutTitle', 'Blue section heading', { group: 'rest' }),
    t('aboutText1', 'Blue section paragraph 1', 4, { group: 'rest' }),
    t('aboutText2', 'Blue section paragraph 2', 4, { group: 'rest' }),
    s('aboutButton', 'Blue section button', { group: 'rest' }),
    defineField({ name: 'aboutStats', title: 'Blue section stats', type: 'array', of: [stat], group: 'rest', validation: (r) => r.max(4) }),
    s('processTitle', 'Process heading', { group: 'rest' }),
    t('testimonialQuote', 'Testimonial quote', 3, { group: 'rest' }),
    s('testimonialName', 'Testimonial name', { group: 'rest' }),
    s('testimonialRole', 'Testimonial title & company', { group: 'rest' }),
    s('contactTitle', 'Contact heading', { group: 'rest' }),
    t('contactText', 'Contact text', 2, { group: 'rest' }),
  ],
  preview: { prepare: () => ({ title: 'Home page' }) },
});

/* ---------- Services ---------- */
export const servicesPage = defineType({
  name: 'servicesPage',
  title: 'Services page',
  type: 'document',
  fields: [
    s('heroLine1', 'Headline — line 1'),
    s('heroLine2', 'Headline — line 2', { description: 'Shown in blue.' }),
    t('intro', 'Intro text', 3),
    defineField({
      name: 'services',
      title: 'Your services',
      type: 'array',
      validation: (r) => r.max(3),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'service',
          fields: [
            s('name', 'Service name'),
            s('promise', 'One-line promise'),
            t('description', 'Description', 5),
            defineField({
              name: 'includes',
              title: 'What’s included',
              type: 'array',
              of: [defineArrayMember({ type: 'object', name: 'include', fields: [s('title', 'Item'), t('detail', 'Detail shown when opened', 3)], preview: { select: { title: 'title' } } })],
            }),
            s('price', 'Price line', { description: 'e.g. From £2,000 · or price on request' }),
            s('resultLabel', 'Floating card — label'),
            s('resultValue', 'Floating card — number'),
          ],
          preview: { select: { title: 'name', subtitle: 'promise' } },
        }),
      ],
    }),
    s('whyTitle', '“Why clients choose me” heading'),
    defineField({
      name: 'reasons',
      title: 'Reasons',
      type: 'array',
      validation: (r) => r.max(3),
      of: [defineArrayMember({ type: 'object', name: 'reason', fields: [s('title', 'Title'), t('text', 'Text', 2)], preview: { select: { title: 'title' } } })],
    }),
  ],
  preview: { prepare: () => ({ title: 'Services page' }) },
});

/* ---------- About ---------- */
export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About page',
  type: 'document',
  fields: [
    s('heroLine1', 'Headline — line 1'),
    s('heroLine2', 'Headline — line 2', { description: 'Shown in blue.' }),
    t('intro', 'Intro text', 3),
    img('photo', 'Photo beside your story'),
    s('storyTitle', 'Story heading'),
    t('story', 'Your story', 10, { description: 'Leave a blank line between paragraphs.' }),
    s('valuesTitle', 'Values heading'),
    defineField({
      name: 'values',
      title: 'Values',
      type: 'array',
      validation: (r) => r.max(3),
      of: [defineArrayMember({ type: 'object', name: 'value', fields: [s('title', 'Title'), t('text', 'Text', 2)], preview: { select: { title: 'title' } } })],
    }),
    s('equipmentTitle', 'Equipment heading'),
    t('equipmentIntro', 'Equipment intro', 2),
  ],
  preview: { prepare: () => ({ title: 'About page' }) },
});

/* ---------- Process ---------- */
export const processPage = defineType({
  name: 'processPage',
  title: 'Process page',
  type: 'document',
  fields: [
    s('heroLine1', 'Headline — line 1'),
    s('heroLine2', 'Headline — line 2', { description: 'Shown in blue.' }),
    t('intro', 'Intro text', 3),
    s('faqTitle', 'Questions heading'),
    defineField({ name: 'faqs', title: 'Questions', type: 'array', of: [faq] }),
  ],
  preview: { prepare: () => ({ title: 'Process page' }) },
});

export const processStep = defineType({
  name: 'processStep',
  title: 'Process step',
  type: 'document',
  fields: [
    s('title', 'Step name', { validation: (r) => r.required() }),
    defineField({ name: 'order', title: 'Position', type: 'number', description: '1 = first step.', validation: (r) => r.required().min(1) }),
    s('duration', 'Duration'),
    t('description', 'Description', 5),
    defineField({ name: 'outputs', title: 'Outputs', type: 'array', of: [defineArrayMember({ type: 'string' })], options: { layout: 'tags' } }),
  ],
  orderings: [{ title: 'Position', name: 'pos', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: { title: 'title', order: 'order', duration: 'duration' },
    prepare: ({ title, order, duration }) => ({ title: `${order ? String(order).padStart(2, '0') + ' — ' : ''}${title || 'Step'}`, subtitle: duration }),
  },
});

/* ---------- Work ---------- */
export const workPage = defineType({
  name: 'workPage',
  title: 'Work page',
  type: 'document',
  fields: [
    s('heroLine1', 'Headline — line 1'),
    s('heroLine2', 'Headline — line 2', { description: 'Shown in blue.' }),
    t('intro', 'Intro text', 3),
    defineField({
      name: 'thumbShape',
      title: 'Thumbnail shape',
      type: 'string',
      initialValue: 'landscape',
      options: { list: [{ title: 'Landscape 4:3', value: 'landscape' }, { title: 'Portrait 4:5', value: 'portrait' }, { title: 'Square', value: 'square' }, { title: 'Wide 16:9', value: 'wide' }], layout: 'radio' },
    }),
    defineField({
      name: 'galleryColumns',
      title: 'Photo gallery columns',
      type: 'number',
      initialValue: 3,
      options: { list: [2, 3, 4], layout: 'radio', direction: 'horizontal' },
    }),
  ],
  preview: { prepare: () => ({ title: 'Work page' }) },
});

/* ---------- Contact ---------- */
export const contactPage = defineType({
  name: 'contactPage',
  title: 'Contact page',
  type: 'document',
  fields: [
    s('heroLine1', 'Headline — line 1'),
    s('heroLine2', 'Headline — line 2', { description: 'Shown in blue.' }),
    t('intro', 'Intro text', 3),
    s('email', 'Email'),
    s('phone', 'Phone'),
    t('address', 'Office / base address', 2),
    s('hours', 'Hours'),
    s('formTitle', 'Form heading'),
    defineField({ name: 'services', title: 'Services in the form drop-down', type: 'array', of: [defineArrayMember({ type: 'string' })], options: { layout: 'tags' } }),
    defineField({ name: 'budgets', title: 'Budget ranges in the form drop-down', type: 'array', of: [defineArrayMember({ type: 'string' })], options: { layout: 'tags' } }),
    s('faqTitle', 'Questions heading'),
    defineField({ name: 'faqs', title: 'Questions', type: 'array', of: [faq] }),
  ],
  preview: { prepare: () => ({ title: 'Contact page' }) },
});

/* ---------- Enquiries (filled in by the contact form) ---------- */
export const enquiry = defineType({
  name: 'enquiry',
  title: 'Enquiry',
  type: 'document',
  fields: [
    defineField({ name: 'replied', title: 'Replied', type: 'boolean', initialValue: false, description: 'Tick once you’ve replied, so you can keep track.' }),
    t('notes', 'Your notes', 3, { description: 'Private — only visible in the dashboard.' }),
    s('name', 'Name', { readOnly: true }),
    s('company', 'Company', { readOnly: true }),
    s('email', 'Email', { readOnly: true }),
    s('phone', 'Phone', { readOnly: true }),
    s('service', 'Service', { readOnly: true }),
    s('budget', 'Budget', { readOnly: true }),
    t('details', 'Project details', 6, { readOnly: true }),
    defineField({ name: 'receivedAt', title: 'Received', type: 'datetime', readOnly: true }),
  ],
  orderings: [{ title: 'Newest first', name: 'newest', by: [{ field: 'receivedAt', direction: 'desc' }] }],
  preview: {
    select: { name: 'name', company: 'company', at: 'receivedAt', replied: 'replied' },
    prepare: ({ name, company, at, replied }) => ({
      title: `${replied ? '✓ ' : '● '}${[name, company].filter(Boolean).join(' — ') || 'Enquiry'}`,
      subtitle: `${replied ? 'Replied' : 'To reply'}${at ? ' · ' + new Date(at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : ''}`,
    }),
  },
});
