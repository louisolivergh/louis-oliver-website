import { defineArrayMember, defineField, defineType } from 'sanity';
import { CLIENT_CATEGORIES } from '../clientData';
import { CompanyPicker } from '../components/CompanyPicker';

/* Companies and the people who work there (your clients).
   A company is a business you shoot for; a client is one person, who usually works for or owns a
   company. Both appear in Updates → Clients, where most are found for you from your booked shoots.
   Nothing counts until you press Save, and neither is ever published: they hold contact details,
   so like booked shoots they stay private. */

const today = () => new Date().toISOString().slice(0, 10);
const tags = (name, title, extra = {}) => defineField({ name, title, type: 'array', of: [defineArrayMember({ type: 'string' })], options: { layout: 'tags' }, ...extra });

export const company = defineType({
  name: 'company',
  title: 'Company',
  type: 'document',
  // the dashboard shows its own header card instead (sanity/components/FormChrome.jsx)
  __experimental_formPreviewTitle: false,
  fieldsets: [
    { name: 'about', title: 'The company', options: { columns: 2 } },
    { name: 'contact', title: 'Getting hold of them', description: 'Their main details. The people you deal with there are added as clients.', options: { columns: 2 } },
    { name: 'more', title: 'More', description: 'Shoots and enquiries under any of their other names are grouped with this company.' },
  ],
  fields: [
    defineField({ name: 'name', title: 'Company name', type: 'string', fieldset: 'about', placeholder: 'e.g. Otellos', validation: (r) => r.required() }),
    defineField({ name: 'category', title: 'Category', type: 'string', fieldset: 'about', options: { list: CLIENT_CATEGORIES } }),
    defineField({ name: 'website', title: 'Website', type: 'url', fieldset: 'contact', placeholder: 'https://', validation: (r) => r.uri({ allowRelative: false, scheme: ['http', 'https'] }) }),
    defineField({ name: 'email', title: 'Main email', type: 'string', fieldset: 'contact', placeholder: 'hello@business.co.uk' }),
    defineField({ name: 'phone', title: 'Main phone', type: 'string', fieldset: 'contact', placeholder: 'e.g. 01273 000000' }),
    defineField({ name: 'address', title: 'Address', type: 'text', rows: 2, fieldset: 'contact', placeholder: 'Street, town and postcode' }),
    tags('aliases', 'Also known as', { fieldset: 'more', description: 'Type a name and press Enter, e.g. Otellos Brighton.' }),
    defineField({ name: 'notes', title: 'Notes', type: 'text', rows: 4, fieldset: 'more' }),
    defineField({ name: 'addedAt', title: 'Added', type: 'date', fieldset: 'more', initialValue: today, options: { dateFormat: 'D MMM YYYY' } }),
    defineField({ name: 'savedAt', title: 'Saved', type: 'datetime', hidden: true, readOnly: true }),
  ],
  orderings: [{ title: 'Name, A to Z', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] }],
  preview: {
    select: { title: 'name', category: 'category' },
    prepare: ({ title, category }) => ({ title: title || 'New company', subtitle: (CLIENT_CATEGORIES.find((c) => c.value === category) || {}).title || 'Company' }),
  },
});

export const client = defineType({
  name: 'client',
  title: 'Client',
  type: 'document',
  __experimental_formPreviewTitle: false,
  fieldsets: [
    { name: 'who', title: 'Who they are', options: { columns: 2 } },
    { name: 'contact', title: 'Getting hold of them', options: { columns: 2 } },
    { name: 'more', title: 'More' },
  ],
  fields: [
    defineField({ name: 'name', title: 'Their name', type: 'string', fieldset: 'who', placeholder: 'e.g. Sarah Cole', validation: (r) => r.required() }),
    defineField({ name: 'role', title: 'Their role', type: 'string', fieldset: 'who', placeholder: 'e.g. Owner' }),
    defineField({
      name: 'company',
      title: 'Which company do they work for or own?',
      description: 'Pick one of your companies, or type a new one. Leave it empty if they book as themselves.',
      type: 'reference',
      to: [{ type: 'company' }],
      weak: true,
      components: { input: CompanyPicker },
    }),
    tags('emails', 'Email addresses', { fieldset: 'contact', description: 'Type one and press Enter.' }),
    tags('phones', 'Phone numbers', { fieldset: 'contact', description: 'Type one and press Enter.' }),
    defineField({ name: 'notes', title: 'Notes', type: 'text', rows: 4, fieldset: 'more' }),
    defineField({ name: 'addedAt', title: 'Client since', type: 'date', fieldset: 'more', initialValue: today, options: { dateFormat: 'D MMM YYYY' } }),
    defineField({ name: 'savedAt', title: 'Saved', type: 'datetime', hidden: true, readOnly: true }),
    // from the first version of clients, when a client could be a whole company: kept so older records still open cleanly
    defineField({ name: 'kind', title: 'Kind', type: 'string', hidden: true }),
    defineField({ name: 'category', title: 'Category', type: 'string', hidden: true }),
    defineField({ name: 'website', title: 'Website', type: 'url', hidden: true }),
    tags('aliases', 'Also known as', { hidden: true }),
    defineField({
      name: 'people',
      title: 'People',
      type: 'array',
      hidden: true,
      of: [
        defineArrayMember({
          name: 'person',
          type: 'object',
          fields: [
            defineField({ name: 'name', type: 'string' }),
            defineField({ name: 'role', type: 'string' }),
            tags('emails', 'Emails'),
            tags('phones', 'Phones'),
          ],
        }),
      ],
    }),
  ],
  orderings: [{ title: 'Name, A to Z', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] }],
  preview: {
    select: { title: 'name', role: 'role', company: 'company.name' },
    prepare: ({ title, role, company }) => ({ title: title || 'New client', subtitle: [role, company].filter(Boolean).join(' · ') || 'Client' }),
  },
});
