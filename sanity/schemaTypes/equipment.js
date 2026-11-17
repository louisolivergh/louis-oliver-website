import { defineField, defineType } from 'sanity';
import { EQUIPMENT_CATEGORIES } from '../categories';

export { EQUIPMENT_CATEGORIES };

export const equipment = defineType({
  name: 'equipment',
  title: 'Equipment',
  type: 'document',
  // the dashboard shows its own header card instead (sanity/components/FormChrome.jsx)
  __experimental_formPreviewTitle: false,
  fieldsets: [
    { name: 'item', title: 'The item', options: { columns: 2 } },
    { name: 'place', title: 'Where it appears', description: 'Your About page groups kit by category.' },
  ],
  fields: [
    defineField({ name: 'name', title: 'Item name', type: 'string', fieldset: 'item', placeholder: 'e.g. Sony FX6', validation: (r) => r.required() }),
    defineField({ name: 'spec', title: 'Spec', type: 'string', fieldset: 'item', placeholder: 'e.g. 4K, full frame' }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      fieldset: 'place',
      options: { list: EQUIPMENT_CATEGORIES, layout: 'radio', direction: 'horizontal' },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'order', title: 'Order in its list', type: 'number', fieldset: 'place', description: '1 = first. Leave empty to sort by name.' }),
  ],
  orderings: [{ title: 'Category', name: 'cat', by: [{ field: 'category', direction: 'asc' }, { field: 'order', direction: 'asc' }] }],
  preview: {
    select: { title: 'name', spec: 'spec', category: 'category' },
    prepare({ title, spec, category }) {
      const cat = EQUIPMENT_CATEGORIES.find((c) => c.value === category);
      return { title, subtitle: [cat && cat.title, spec].filter(Boolean).join(' · ') };
    },
  },
});
