import { defineArrayMember, defineField, defineType } from 'sanity';
import { CLIENT_CATEGORIES } from '../clientData';

/* A client: a company (or someone booking as themselves) you've shot for. Most clients are found
   automatically from your booked shoots (Updates → Clients); save one here to give it a category,
   notes, or to add a client before their first booking. Like booked shoots, clients are never
   published: they hold contact details, so they stay private and save as you type. */

const person = defineArrayMember({
  name: 'person',
  title: 'Person',
  type: 'object',
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string' }),
    defineField({ name: 'role', title: 'Role', type: 'string', placeholder: 'e.g. Marketing manager' }),
    defineField({ name: 'emails', title: 'Email addresses', type: 'array', of: [defineArrayMember({ type: 'string' })], options: { layout: 'tags' } }),
    defineField({ name: 'phones', title: 'Phone numbers', type: 'array', of: [defineArrayMember({ type: 'string' })], options: { layout: 'tags' } }),
  ],
  preview: {
    select: { name: 'name', role: 'role', emails: 'emails', phones: 'phones' },
    prepare: ({ name, role, emails, phones }) => ({
      title: name || (emails && emails[0]) || 'Someone',
      subtitle: [role, emails && emails[0], phones && phones.join(', ')].filter(Boolean).join(' · '),
    }),
  },
});

export const client = defineType({
  name: 'client',
  title: 'Client',
  type: 'document',
  // the dashboard shows its own header card instead (sanity/components/FormChrome.jsx)
  __experimental_formPreviewTitle: false,
  fieldsets: [
    { name: 'who', title: 'Who they are', options: { columns: 2 } },
    { name: 'contacts', title: 'People', description: 'Everyone you deal with there. People from their bookings and enquiries also show on the Clients page by themselves.' },
    { name: 'more', title: 'More', description: 'Other names they book under are grouped with this client.' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Client name',
      type: 'string',
      fieldset: 'who',
      placeholder: 'e.g. Peak Gym',
      description: 'The company, or the person’s name if they book as themselves.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'kind',
      title: 'They are',
      type: 'string',
      fieldset: 'who',
      initialValue: 'company',
      options: { list: [{ title: 'A company', value: 'company' }, { title: 'A person', value: 'person' }], layout: 'radio', direction: 'horizontal' },
    }),
    defineField({ name: 'category', title: 'Category', type: 'string', fieldset: 'who', options: { list: CLIENT_CATEGORIES } }),
    defineField({ name: 'website', title: 'Website', type: 'url', fieldset: 'who', validation: (r) => r.uri({ allowRelative: false, scheme: ['http', 'https'] }) }),
    defineField({ name: 'people', title: 'People', type: 'array', of: [person], fieldset: 'contacts' }),
    defineField({
      name: 'aliases',
      title: 'Also known as',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
      fieldset: 'more',
      description: 'Type a name and press Enter, e.g. Peak Gym Hertford.',
    }),
    defineField({ name: 'notes', title: 'Notes', type: 'text', rows: 4, fieldset: 'more' }),
    defineField({ name: 'addedAt', title: 'Client since', type: 'date', fieldset: 'more', initialValue: () => new Date().toISOString().slice(0, 10), options: { dateFormat: 'D MMM YYYY' } }),
  ],
  orderings: [
    { title: 'Name, A to Z', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] },
    { title: 'Newest first', name: 'addedDesc', by: [{ field: 'addedAt', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'name', category: 'category', people: 'people' },
    prepare: ({ title, category, people }) => {
      const cat = CLIENT_CATEGORIES.find((c) => c.value === category);
      const n = Array.isArray(people) ? people.length : 0;
      return { title: title || 'New client', subtitle: [cat && cat.title, n ? `${n} ${n === 1 ? 'person' : 'people'}` : ''].filter(Boolean).join(' · ') };
    },
  },
});
