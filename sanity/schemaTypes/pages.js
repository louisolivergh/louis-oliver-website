import { defineArrayMember, defineField, defineType } from 'sanity';

/* Small helpers so every text box is quick to define. Empty fields fall back to placeholder text on the site. */
const s = (name, title, extra = {}) => defineField({ name, title, type: 'string', ...extra });
const t = (name, title, rows = 3, extra = {}) => defineField({ name, title, type: 'text', rows, ...extra });
const img = (name, title, extra = {}) => defineField({ name, title, type: 'image', options: { hotspot: true }, ...extra });

const stat = defineArrayMember({
  type: 'object',
  name: 'stat',
  fields: [s('value', 'Number (e.g. 120+)'), s('label', 'Label')],
  preview: { select: { title: 'value', subtitle: 'label' } },
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
    defineField({ name: 'logo', title: 'Logo image (replaces the logo text)', type: 'image' }),
    defineField({ name: 'logoFooter', title: 'Footer logo image (e.g. a white version)', type: 'image' }),
    defineField({ name: 'logoHeight', title: 'Logo height (px)', type: 'number', initialValue: 40 }),
    t('footerText', 'Footer description', 2),
    defineField({
      name: 'socials',
      title: 'Social links',
      type: 'array',
      of: [defineArrayMember({ type: 'object', name: 'social', fields: [s('label', 'Name (e.g. Instagram)'), defineField({ name: 'url', title: 'Link', type: 'url' })], preview: { select: { title: 'label', subtitle: 'url' } } })],
    }),
    s('ctaTitle', 'Bottom call-to-action heading (all pages)'),
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
    img('heroPhoto', 'Your photo (replaces “LO” in the blue picture)', { group: 'hero' }),
    s('heroTagline', 'Small tagline above the headline', { group: 'hero' }),
    s('heroLine1', 'Headline — line 1', { group: 'hero' }),
    s('heroLine2', 'Headline — line 2', { group: 'hero' }),
    s('heroLine3', 'Headline — line 3 (shown in blue)', { group: 'hero' }),
    t('heroText', 'Text under the headline', 3, { group: 'hero' }),
    s('primaryButton', 'Main button text', { group: 'hero' }),
    s('secondaryButton', 'Second button text', { group: 'hero' }),
    defineField({ name: 'heroStats', title: 'Stats under the buttons (3)', type: 'array', of: [stat], group: 'hero', validation: (r) => r.max(3) }),
    s('metricLabel', 'Floating card — label', { group: 'hero' }),
    s('metricValue', 'Floating card — number', { group: 'hero' }),
    s('statusLine', 'Floating status line (e.g. Now booking)', { group: 'hero' }),

    s('clientsTitle', 'Client strip heading', { group: 'rest' }),
    defineField({ name: 'clients', title: 'Client names (scrolling strip)', type: 'array', of: [defineArrayMember({ type: 'string' })], options: { layout: 'tags' }, group: 'rest' }),
    s('servicesTitle', 'Services heading', { group: 'rest' }),
    t('servicesIntro', 'Services intro', 2, { group: 'rest' }),
    s('aboutTitle', 'Blue section heading', { group: 'rest' }),
    t('aboutText1', 'Blue section paragraph 1', 4, { group: 'rest' }),
    t('aboutText2', 'Blue section paragraph 2', 4, { group: 'rest' }),
    s('aboutButton', 'Blue section button', { group: 'rest' }),
    defineField({ name: 'aboutStats', title: 'Blue section stats (4)', type: 'array', of: [stat], group: 'rest', validation: (r) => r.max(4) }),
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
    s('heroLine2', 'Headline — line 2 (blue)'),
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
              title: 'What’s included (drop-down list)',
              type: 'array',
              of: [defineArrayMember({ type: 'object', name: 'include', fields: [s('title', 'Item'), t('detail', 'Detail shown when opened', 3)], preview: { select: { title: 'title' } } })],
            }),
            s('price', 'Price line (e.g. From £2,000 · or price on request)'),
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
      title: 'Reasons (3)',
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
    s('heroLine2', 'Headline — line 2 (blue)'),
    t('intro', 'Intro text', 3),
    img('photo', 'Photo beside your story'),
    s('storyTitle', 'Story heading'),
    t('story', 'Your story (leave a blank line between paragraphs)', 10),
    s('valuesTitle', 'Values heading'),
    defineField({
      name: 'values',
      title: 'Values (3)',
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
    s('heroLine2', 'Headline — line 2 (blue)'),
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
    defineField({ name: 'order', title: 'Position (1 = first)', type: 'number', validation: (r) => r.required().min(1) }),
    s('duration', 'Duration (optional, e.g. 1 week)'),
    t('description', 'Description', 5),
    defineField({ name: 'outputs', title: 'Outputs (optional)', type: 'array', of: [defineArrayMember({ type: 'string' })], options: { layout: 'tags' } }),
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
    s('heroLine2', 'Headline — line 2 (blue)'),
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
    s('heroLine2', 'Headline — line 2 (blue)'),
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
  readOnly: true,
  fields: [
    s('name', 'Name'),
    s('company', 'Company'),
    s('email', 'Email'),
    s('phone', 'Phone'),
    s('service', 'Service'),
    s('budget', 'Budget'),
    t('details', 'Project details', 6),
    defineField({ name: 'receivedAt', title: 'Received', type: 'datetime' }),
  ],
  orderings: [{ title: 'Newest first', name: 'newest', by: [{ field: 'receivedAt', direction: 'desc' }] }],
  preview: {
    select: { name: 'name', company: 'company', at: 'receivedAt' },
    prepare: ({ name, company, at }) => ({ title: [name, company].filter(Boolean).join(' — ') || 'Enquiry', subtitle: at ? new Date(at).toLocaleString('en-GB') : '' }),
  },
});
