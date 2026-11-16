import { defineField, defineType } from 'sanity';
import { EQUIPMENT_CATEGORIES } from '../categories';

export { EQUIPMENT_CATEGORIES };

export const equipment = defineType({
  name: 'equipment',
  title: 'Equipment',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Item name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'spec', title: 'Spec', type: 'string', description: 'e.g. 6K, full frame' }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: { list: EQUIPMENT_CATEGORIES, layout: 'radio' },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'order', title: 'Order in its list', type: 'number', description: '1 = first. Leave empty to sort by name.' }),
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
