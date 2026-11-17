import { defineArrayMember, defineField, defineType } from 'sanity';

/* Small helpers so every text box is quick to define. Empty fields fall back to placeholder text on the site,
   the same text is shown faintly inside each empty box in the dashboard, so you can see what's live. */
const s = (name, title, extra = {}) => defineField({ name, title, type: 'string', ...extra });
const t = (name, title, rows = 3, extra = {}) => defineField({ name, title, type: 'text', rows, ...extra });
const img = (name, title, extra = {}) => defineField({ name, title, type: 'image', options: { hotspot: true }, ...extra });

const show = (title = 'Show on website') => defineField({ name: 'show', title, type: 'boolean', initialValue: true });

/* The dashboard shows its own header card on every page you edit (sanity/components/FormChrome.jsx) */
const page = { __experimental_formPreviewTitle: false };

/* "Top of the page" section, used by most pages */
const TOP = { name: 'top', title: 'Top of the page', description: 'The big headline and the short intro under it.' };
const heroFields = (line1, line2, intro) => [
  s('heroLine1', 'Headline line 1', { fieldset: 'top', placeholder: line1 }),
  s('heroLine2', 'Headline line 2', { fieldset: 'top', description: 'Shown in blue.', placeholder: line2 }),
  t('intro', 'Intro text', 3, { fieldset: 'top', placeholder: intro }),
];

const stat = defineArrayMember({
  type: 'object',
  name: 'stat',
  fields: [s('value', 'Number', { placeholder: 'e.g. 250+' }), s('label', 'Label', { placeholder: 'e.g. Shoots delivered' }), show()],
  preview: {
    select: { value: 'value', label: 'label', show: 'show' },
    prepare: ({ value, label, show: on }) => ({ title: `${on === false ? '◌ Hidden: ' : ''}${value || 'Stat'}`, subtitle: label }),
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
    prepare: ({ name, media, show: on }) => ({ title: `${on === false ? '◌ Hidden: ' : ''}${name || 'Client'}`, media }),
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
  ...page,
  fieldsets: [
    { name: 'logoBlock', title: 'Logo', description: 'The logo in the top-left corner of every page.' },
    { name: 'footer', title: 'Footer', description: 'The band at the very bottom of every page.' },
    { name: 'cta', title: 'Call-to-action band', description: 'The “Ready to work together?” band near the bottom of most pages.' },
    { name: 'icons', title: 'Browser tab & dashboard', description: 'Optional. The built-in Louis Oliver icons are used until you upload your own.' },
  ],
  fields: [
    s('logoName', 'Logo text', { initialValue: 'Louis Oliver', fieldset: 'logoBlock', placeholder: 'Louis Oliver' }),
    defineField({ name: 'showMark', title: 'Show the small blue “LO” square next to the logo text', type: 'boolean', initialValue: true, fieldset: 'logoBlock' }),
    defineField({ name: 'logo', title: 'Logo image', type: 'image', description: 'Replaces the logo text when added.', fieldset: 'logoBlock' }),
    defineField({ name: 'logoHeight', title: 'Logo height', type: 'number', initialValue: 40, description: 'In pixels. 40 is a good starting point.', fieldset: 'logoBlock' }),
    defineField({ name: 'logoFooter', title: 'Footer logo image', type: 'image', description: 'Optional, e.g. a white version for the dark footer.', fieldset: 'footer' }),
    t('footerText', 'Footer description', 2, { fieldset: 'footer', placeholder: '[One-line company description for the footer.]' }),
    defineField({
      name: 'socials',
      title: 'Social links',
      type: 'array',
      fieldset: 'footer',
      placeholder: 'No social links yet. Add Instagram, LinkedIn and so on below.',
      of: [defineArrayMember({ type: 'object', name: 'social', fields: [s('label', 'Name', { placeholder: 'e.g. Instagram' }), defineField({ name: 'url', title: 'Link', type: 'url' })], preview: { select: { title: 'label', subtitle: 'url' } } })],
    }),
    s('ctaTitle', 'Heading', { fieldset: 'cta', placeholder: '[Ready to work together?]' }),
    t('ctaText', 'Text', 2, { fieldset: 'cta', placeholder: '[A short line inviting the visitor to get in touch.]' }),
    s('ctaButton', 'Button', { fieldset: 'cta', placeholder: '[Start a project]' }),
    defineField({
      name: 'favicon',
      title: 'Favicon',
      type: 'image',
      fieldset: 'icons',
      description: 'The small icon in the browser tab. Use a square image, ideally 512 × 512 px (PNG or SVG). Upload here only to replace the built-in one.',
    }),
    defineField({
      name: 'dashboardLogo',
      title: 'Dashboard logo',
      type: 'image',
      fieldset: 'icons',
      description: 'Shown in the top-left of this dashboard. A square image works best. If empty, your logo image is used, then the blue LO mark.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
});

/* ---------- Home ---------- */
export const homePage = defineType({
  name: 'homePage',
  title: 'Home page',
  type: 'document',
  ...page,
  groups: [
    { name: 'hero', title: 'Top section', default: true },
    { name: 'rest', title: 'Other sections' },
  ],
  fieldsets: [
    { name: 'headline', title: 'Headline', description: 'The big text at the top of your homepage.' },
    { name: 'buttons', title: 'Buttons', description: 'The two buttons under the headline.', options: { columns: 2 } },
    { name: 'photo', title: 'Photo & stats', description: 'Your photo sits in the blue square on the right. The stats sit under the buttons.' },
    { name: 'floating', title: 'Floating cards', description: 'The two small cards on top of the blue square. Switch either one off to hide it.' },
    { name: 'clientStrip', title: 'Client logos', description: 'The strip of logos under the top section.' },
    { name: 'services', title: 'Services', description: 'The heading above your three service cards.' },
    { name: 'about', title: 'Blue section', description: 'The big blue panel about you and your company.' },
    { name: 'process', title: 'Process', description: 'The heading above your steps. The steps themselves are under Process steps.' },
    { name: 'testimonial', title: 'Backup review', description: 'Only shown until one of your shoots has a client review. After that, those rotate here automatically.' },
    { name: 'contact', title: 'Contact', description: 'The heading and text beside the enquiry form at the bottom.' },
  ],
  fields: [
    s('heroTagline', 'Small tagline above the headline', { group: 'hero', fieldset: 'headline', placeholder: '[Short tagline, e.g. your category]' }),
    s('heroLine1', 'Headline line 1', { group: 'hero', fieldset: 'headline', placeholder: '[Your bold' }),
    s('heroLine2', 'Headline line 2', { group: 'hero', fieldset: 'headline', placeholder: 'headline goes' }),
    s('heroLine3', 'Headline line 3', { group: 'hero', fieldset: 'headline', description: 'Shown in blue.', placeholder: 'right here.]' }),
    t('heroText', 'Text under the headline', 3, { group: 'hero', fieldset: 'headline', placeholder: '[Supporting sentence. One or two lines explaining what Louis Oliver does and who it does it for.]' }),
    s('primaryButton', 'Main button', { group: 'hero', fieldset: 'buttons', placeholder: '[Primary action]' }),
    s('secondaryButton', 'Second button', { group: 'hero', fieldset: 'buttons', placeholder: '[Secondary action]' }),
    img('heroPhoto', 'Your photo', { group: 'hero', fieldset: 'photo' }),
    defineField({
      name: 'heroStats',
      title: 'Stats under the buttons',
      type: 'array',
      of: [stat],
      group: 'hero',
      fieldset: 'photo',
      validation: (r) => r.max(3),
      description: 'Up to three. Untick “Show on website” to hide one. If all are hidden, the row disappears.',
      placeholder: 'No stats yet. The website shows example numbers until you add your own.',
    }),
    defineField({ name: 'showMetric', title: 'Show the white floating card', type: 'boolean', initialValue: true, group: 'hero', fieldset: 'floating' }),
    s('metricLabel', 'White card label', { group: 'hero', fieldset: 'floating', placeholder: '[Metric label]', hidden: ({ document }) => document && document.showMetric === false }),
    s('metricValue', 'White card number', { group: 'hero', fieldset: 'floating', placeholder: '[+000%]', hidden: ({ document }) => document && document.showMetric === false }),
    defineField({ name: 'showStatus', title: 'Show the floating status line', type: 'boolean', initialValue: true, group: 'hero', fieldset: 'floating' }),
    s('statusLine', 'Status line', { group: 'hero', fieldset: 'floating', placeholder: '[Status line, e.g. now booking]', hidden: ({ document }) => document && document.showStatus === false }),

    defineField({ name: 'showClients', title: 'Show the client logo strip', type: 'boolean', initialValue: true, group: 'rest', fieldset: 'clientStrip' }),
    s('clientsTitle', 'Heading', { group: 'rest', fieldset: 'clientStrip', placeholder: '[Trusted by industry leaders]', hidden: ({ document }) => document && document.showClients === false }),
    defineField({
      name: 'clientLogos',
      title: 'Client logos',
      type: 'array',
      of: [clientLogo],
      group: 'rest',
      fieldset: 'clientStrip',
      description: 'Add each client’s logo. Untick “Show on website” to hide one. If all are hidden, the strip disappears.',
      placeholder: 'No logos yet. Add your first client below.',
      hidden: ({ document }) => document && document.showClients === false,
    }),
    defineField({ name: 'clients', title: 'Client names (old)', type: 'array', of: [defineArrayMember({ type: 'string' })], options: { layout: 'tags' }, group: 'rest', fieldset: 'clientStrip', hidden: true }),
    s('servicesTitle', 'Heading', { group: 'rest', fieldset: 'services', placeholder: '[Section headline about what you offer.]' }),
    t('servicesIntro', 'Intro', 2, { group: 'rest', fieldset: 'services', placeholder: '[Short intro paragraph for the services section.]' }),
    s('aboutTitle', 'Heading', { group: 'rest', fieldset: 'about', placeholder: '[A confident statement about your company and why clients choose you.]' }),
    t('aboutText1', 'Paragraph 1', 4, { group: 'rest', fieldset: 'about', placeholder: '[Paragraph one. Tell the story of the business, its experience, and the scale of results it delivers.]' }),
    t('aboutText2', 'Paragraph 2', 4, { group: 'rest', fieldset: 'about', placeholder: '[Paragraph two. Describe your approach, your standards and what working with you feels like.]' }),
    s('aboutButton', 'Button', { group: 'rest', fieldset: 'about', placeholder: '[Call to action]' }),
    defineField({
      name: 'aboutStats',
      title: 'Stats',
      type: 'array',
      of: [stat],
      group: 'rest',
      fieldset: 'about',
      validation: (r) => r.max(4),
      description: 'Up to four.',
      placeholder: 'No stats yet. The website shows example numbers until you add your own.',
    }),
    s('processTitle', 'Heading', { group: 'rest', fieldset: 'process', placeholder: '[A clear process from first call to results.]' }),
    t('testimonialQuote', 'Review', 3, { group: 'rest', fieldset: 'testimonial', placeholder: '[Client testimonial goes here. A short, powerful quote about the results Louis Oliver delivered.]' }),
    s('testimonialName', 'Name', { group: 'rest', fieldset: 'testimonial', placeholder: '[Client name]' }),
    s('testimonialRole', 'Title & company', { group: 'rest', fieldset: 'testimonial', placeholder: '[Title, Company]' }),
    s('contactTitle', 'Heading', { group: 'rest', fieldset: 'contact', placeholder: '[Let’s build something big.]' }),
    t('contactText', 'Text', 2, { group: 'rest', fieldset: 'contact', placeholder: '[Invite prospective clients to get in touch. Mention response time.]' }),
  ],
  preview: { prepare: () => ({ title: 'Home page' }) },
});

/* ---------- Services ---------- */
export const servicesPage = defineType({
  name: 'servicesPage',
  title: 'Services page',
  type: 'document',
  ...page,
  fieldsets: [TOP, { name: 'why', title: 'Why clients choose me', description: 'The three reasons under your services.' }],
  fields: [
    ...heroFields('[What I do,', 'done properly.]', '[Introduce your services and the kind of clients you serve.]'),
    defineField({
      name: 'services',
      title: 'Your services',
      type: 'array',
      validation: (r) => r.max(3),
      description: 'Your three services, in the order they appear. Drag to reorder.',
      placeholder: 'No services yet. The website shows three example services until you add yours.',
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
            s('resultLabel', 'Floating card label'),
            s('resultValue', 'Floating card number'),
          ],
          preview: { select: { title: 'name', subtitle: 'promise' } },
        }),
      ],
    }),
    s('whyTitle', 'Heading', { fieldset: 'why', placeholder: '[Why the biggest clients work with me.]' }),
    defineField({
      name: 'reasons',
      title: 'Reasons',
      type: 'array',
      fieldset: 'why',
      validation: (r) => r.max(3),
      placeholder: 'No reasons yet. Add up to three below.',
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
  ...page,
  fieldsets: [
    TOP,
    { name: 'storyBlock', title: 'Your story', description: 'Your photo and the story beside it.' },
    { name: 'valuesBlock', title: 'Values', description: 'The three principles behind your work.' },
    { name: 'equipment', title: 'Equipment', description: 'The heading above your kit. The kit itself is under Regular updates → Equipment list.' },
  ],
  fields: [
    ...heroFields('[The story behind', 'the name.]', '[A short introduction: who you are, what you stand for, and why it matters to your clients.]'),
    img('photo', 'Photo beside your story', { fieldset: 'storyBlock' }),
    s('storyTitle', 'Heading', { fieldset: 'storyBlock', placeholder: '[How Louis Oliver started and where it is going.]' }),
    t('story', 'Your story', 10, { fieldset: 'storyBlock', description: 'Leave a blank line between paragraphs.', placeholder: '[Paragraph one of your story. The beginning, the first big client.]\n\n[Paragraph two. Growth, milestones and the reputation you have built.]\n\n[Paragraph three. Your mission and where the business is heading next.]' }),
    s('valuesTitle', 'Heading', { fieldset: 'valuesBlock', placeholder: '[The principles behind every project.]' }),
    defineField({
      name: 'values',
      title: 'Values',
      type: 'array',
      fieldset: 'valuesBlock',
      validation: (r) => r.max(3),
      placeholder: 'No values yet. Add up to three below.',
      of: [defineArrayMember({ type: 'object', name: 'value', fields: [s('title', 'Title'), t('text', 'Text', 2)], preview: { select: { title: 'title' } } })],
    }),
    s('equipmentTitle', 'Heading', { fieldset: 'equipment', placeholder: '[The kit behind every shoot.]' }),
    t('equipmentIntro', 'Intro', 2, { fieldset: 'equipment', placeholder: '[A short line about your setup and why it matters for the quality clients get.]' }),
  ],
  preview: { prepare: () => ({ title: 'About page' }) },
});

/* ---------- Process ---------- */
export const processPage = defineType({
  name: 'processPage',
  title: 'Process page',
  type: 'document',
  ...page,
  fieldsets: [TOP, { name: 'faq', title: 'Questions', description: 'The common questions at the bottom of the page.' }],
  fields: [
    ...heroFields('[A proven path from', 'idea to impact.]', '[Explain how you work with clients and why your process gets results.]'),
    s('faqTitle', 'Heading', { fieldset: 'faq', placeholder: '[Everything you need to know.]' }),
    defineField({ name: 'faqs', title: 'Questions', type: 'array', of: [faq], fieldset: 'faq', placeholder: 'No questions yet. Add your first one below.' }),
  ],
  preview: { prepare: () => ({ title: 'Process page' }) },
});

export const processStep = defineType({
  name: 'processStep',
  title: 'Process step',
  type: 'document',
  ...page,
  fieldsets: [
    { name: 'step', title: 'The step', description: 'What happens at this stage.' },
    { name: 'when', title: 'Order & timing', options: { columns: 2 } },
  ],
  fields: [
    s('title', 'Step name', { fieldset: 'step', placeholder: 'e.g. Discovery call', validation: (r) => r.required() }),
    t('description', 'Description', 5, { fieldset: 'step', placeholder: 'What happens in this step, and what the client is involved in.' }),
    defineField({ name: 'order', title: 'Position', type: 'number', description: '1 = first step.', fieldset: 'when', validation: (r) => r.required().min(1) }),
    s('duration', 'Duration', { fieldset: 'when', placeholder: 'e.g. 1 to 2 days' }),
    defineField({
      name: 'outputs',
      title: 'What the client gets',
      type: 'array',
      description: 'Short tags, e.g. Moodboard or Shot list. Type one and press Enter.',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
    }),
  ],
  orderings: [{ title: 'Position', name: 'pos', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: { title: 'title', order: 'order', duration: 'duration' },
    prepare: ({ title, order, duration }) => ({ title: `${order ? String(order).padStart(2, '0') + ' · ' : ''}${title || 'Step'}`, subtitle: duration }),
  },
});

/* ---------- Work ---------- */
export const workPage = defineType({
  name: 'workPage',
  title: 'Work page',
  type: 'document',
  ...page,
  fieldsets: [TOP, { name: 'layout', title: 'Layout', description: 'How your shoots are laid out on the Work page and inside each shoot.' }],
  fields: [
    ...heroFields('[Selected work for', 'ambitious clients.]', '[A library of shoots. Use the filters to browse by category.]'),
    defineField({
      name: 'thumbShape',
      title: 'Thumbnail shape',
      type: 'string',
      fieldset: 'layout',
      initialValue: 'landscape',
      options: { list: [{ title: 'Landscape 4:3', value: 'landscape' }, { title: 'Portrait 4:5', value: 'portrait' }, { title: 'Square', value: 'square' }, { title: 'Wide 16:9', value: 'wide' }], layout: 'radio' },
    }),
    defineField({
      name: 'galleryColumns',
      title: 'Photo gallery columns',
      type: 'number',
      fieldset: 'layout',
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
  ...page,
  fieldsets: [
    TOP,
    { name: 'details', title: 'Your details', description: 'How clients can reach you, shown beside the form.', options: { columns: 2 } },
    { name: 'form', title: 'Enquiry form', description: 'The form clients fill in. New enquiries arrive in your Inbox and by email.' },
    { name: 'faq', title: 'Questions', description: 'The common questions at the bottom of the page.' },
  ],
  fields: [
    ...heroFields('[Let’s talk about', 'your next move.]', '[Tell prospective clients what happens after they get in touch, and how quickly you reply.]'),
    s('email', 'Email', { fieldset: 'details', placeholder: '[hello@yourdomain.com]' }),
    s('phone', 'Phone', { fieldset: 'details', placeholder: '[+00 0000 000000]' }),
    t('address', 'Office / base address', 2, { fieldset: 'details', placeholder: '[City, Postcode]' }),
    s('hours', 'Hours', { fieldset: 'details', placeholder: '[Mon to Fri, 9:00 to 18:00]' }),
    s('formTitle', 'Form heading', { fieldset: 'form', placeholder: 'Start a project' }),
    defineField({ name: 'services', title: 'Services in the drop-down', type: 'array', of: [defineArrayMember({ type: 'string' })], options: { layout: 'tags' }, fieldset: 'form', description: 'Type one and press Enter.' }),
    defineField({ name: 'budgets', title: 'Budget ranges in the drop-down', type: 'array', of: [defineArrayMember({ type: 'string' })], options: { layout: 'tags' }, fieldset: 'form', description: 'Type one and press Enter, e.g. £2k to £5k.' }),
    s('faqTitle', 'Heading', { fieldset: 'faq', placeholder: '[Common questions from new clients.]' }),
    defineField({ name: 'faqs', title: 'Questions', type: 'array', of: [faq], fieldset: 'faq', placeholder: 'No questions yet. Add your first one below.' }),
  ],
  preview: { prepare: () => ({ title: 'Contact page' }) },
});

/* ---------- Enquiries (filled in by the contact form) ---------- */
export const enquiry = defineType({
  name: 'enquiry',
  title: 'Enquiry',
  type: 'document',
  ...page,
  fieldsets: [
    { name: 'status', title: 'Your follow-up', description: 'Only you can see this.' },
    { name: 'from', title: 'Who it’s from', options: { columns: 2 } },
    { name: 'project', title: 'Their project' },
  ],
  fields: [
    defineField({ name: 'replied', title: 'Replied', type: 'boolean', initialValue: false, fieldset: 'status', description: 'Tick once you’ve replied, so you can keep track.' }),
    defineField({
      name: 'declined',
      title: 'Not going ahead',
      type: 'boolean',
      initialValue: false,
      fieldset: 'status',
      description: 'Tick if it won’t become a shoot: spam, not a fit, or they said no. It drops off your “Quick book” lists.',
    }),
    t('notes', 'Your notes', 3, { fieldset: 'status', description: 'Private. Only visible in the dashboard.', placeholder: 'e.g. Called back on Tuesday, sending a quote Friday.' }),
    s('name', 'Name', { readOnly: true, fieldset: 'from' }),
    s('company', 'Company', { readOnly: true, fieldset: 'from' }),
    s('email', 'Email', { readOnly: true, fieldset: 'from' }),
    s('phone', 'Phone', { readOnly: true, fieldset: 'from' }),
    s('service', 'Service', { readOnly: true, fieldset: 'project' }),
    s('budget', 'Budget', { readOnly: true, fieldset: 'project' }),
    t('details', 'Project details', 6, { readOnly: true, fieldset: 'project' }),
    defineField({ name: 'receivedAt', title: 'Received', type: 'datetime', readOnly: true, fieldset: 'project' }),
  ],
  orderings: [{ title: 'Newest first', name: 'newest', by: [{ field: 'receivedAt', direction: 'desc' }] }],
  preview: {
    select: { name: 'name', company: 'company', at: 'receivedAt', replied: 'replied' },
    prepare: ({ name, company, at, replied }) => ({
      title: `${replied ? '✓ ' : '● '}${[name, company].filter(Boolean).join(' · ') || 'Enquiry'}`,
      subtitle: `${replied ? 'Replied' : 'To reply'}${at ? ' · ' + new Date(at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : ''}`,
    }),
  },
});
