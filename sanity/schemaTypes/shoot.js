import { defineArrayMember, defineField, defineType } from 'sanity';
import { EquipmentTickInput } from '../components/EquipmentTickInput';

/* ---------- reusable pieces ---------- */

const equipmentField = (title = 'Equipment used — tick from your kit') =>
  defineField({
    name: 'equipment',
    title,
    type: 'array',
    of: [defineArrayMember({ type: 'reference', to: [{ type: 'equipment' }] })],
    components: { input: EquipmentTickInput },
  });

const extraEquipmentField = defineField({
  name: 'extraEquipment',
  title: 'Anything else',
  description: 'Kit that isn’t in your equipment list. Type and press Enter.',
  type: 'array',
  of: [defineArrayMember({ type: 'string' })],
  options: { layout: 'tags' },
});

export const videoItem = defineType({
  name: 'videoItem',
  title: 'Video',
  type: 'object',
  fields: [
    defineField({
      name: 'file',
      title: 'Upload a video file',
      type: 'file',
      options: { accept: 'video/*' },
      description: 'MP4 or MOV. For long or very large videos, use a Vimeo/YouTube link below instead.',
    }),
    defineField({
      name: 'url',
      title: '…or paste a Vimeo / YouTube link',
      type: 'url',
      validation: (r) => r.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'shape',
      title: 'Shape',
      description: 'Only needed for Vimeo / YouTube links — uploaded videos size themselves.',
      type: 'string',
      initialValue: 'landscape',
      options: {
        list: [
          { title: 'Landscape 16:9', value: 'landscape' },
          { title: 'Vertical 9:16', value: 'vertical' },
          { title: 'Square 1:1', value: 'square' },
          { title: 'Portrait 4:5', value: 'portrait' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
    }),
  ],
  preview: {
    select: { file: 'file.asset.originalFilename', url: 'url' },
    prepare: ({ file, url }) => ({ title: file || url || 'Video (empty)' }),
  },
});

const photo = defineArrayMember({
  type: 'image',
  options: { hotspot: true },
  fields: [defineField({ name: 'alt', title: 'Description', type: 'string' })],
});

/* ---------- section types ---------- */

const featureVideo = defineArrayMember({
  name: 'featureVideo',
  title: 'Feature video',
  description: 'One video beside its own shoot info and equipment.',
  type: 'object',
  fields: [
    defineField({ name: 'video', title: 'Video', type: 'videoItem' }),
    defineField({ name: 'heading', title: 'Video title', type: 'string' }),
    defineField({ name: 'info', title: 'Shoot info for this video', type: 'text', rows: 4 }),
    equipmentField(),
    extraEquipmentField,
  ],
  preview: { select: { t: 'heading' }, prepare: ({ t }) => ({ title: t || 'Feature video', subtitle: 'Feature video' }) },
});

const fullVideo = defineArrayMember({
  name: 'fullVideo',
  title: 'Full-width video',
  type: 'object',
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({ name: 'video', title: 'Video', type: 'videoItem' }),
    defineField({ name: 'caption', title: 'Caption', type: 'text', rows: 3 }),
  ],
  preview: { select: { t: 'heading' }, prepare: ({ t }) => ({ title: t || 'Full-width video', subtitle: 'Full-width video' }) },
});

const videoGrid = defineArrayMember({
  name: 'videoGrid',
  title: 'Video grid',
  description: 'Several videos side by side — great for vertical social clips.',
  type: 'object',
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({ name: 'videos', title: 'Videos', type: 'array', of: [defineArrayMember({ type: 'videoItem' })] }),
  ],
  preview: {
    select: { t: 'heading', v: 'videos' },
    prepare: ({ t, v }) => ({ title: t || 'Video grid', subtitle: `Video grid · ${(v || []).length} videos` }),
  },
});

const gallery = defineArrayMember({
  name: 'gallery',
  title: 'Photo gallery',
  type: 'object',
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({
      name: 'images',
      title: 'Photos',
      type: 'array',
      of: [photo],
      options: { layout: 'grid' },
      description: 'Drag in as many as you like. Drag to reorder.',
    }),
  ],
  preview: {
    select: { t: 'heading', i: 'images', m: 'images.0' },
    prepare: ({ t, i, m }) => ({ title: t || 'Photo gallery', subtitle: `Photo gallery · ${(i || []).length} photos`, media: m }),
  },
});

const fullPhoto = defineArrayMember({
  name: 'fullPhoto',
  title: 'Full-width photo',
  type: 'object',
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({ name: 'image', title: 'Photo', type: 'image', options: { hotspot: true }, fields: [defineField({ name: 'alt', title: 'Description', type: 'string' })] }),
    defineField({ name: 'caption', title: 'Caption', type: 'text', rows: 3 }),
  ],
  preview: { select: { t: 'heading', m: 'image' }, prepare: ({ t, m }) => ({ title: t || 'Full-width photo', subtitle: 'Full-width photo', media: m }) },
});

const textBlock = defineArrayMember({
  name: 'textBlock',
  title: 'Text block',
  type: 'object',
  fields: [
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({ name: 'text', title: 'Paragraph', type: 'text', rows: 6 }),
  ],
  preview: { select: { t: 'heading' }, prepare: ({ t }) => ({ title: t || 'Text block', subtitle: 'Text block' }) },
});

/* ---------- the shoot ---------- */

export const shoot = defineType({
  name: 'shoot',
  title: 'Shoot',
  type: 'document',
  groups: [
    { name: 'details', title: 'Details', default: true },
    { name: 'page', title: 'Page sections' },
  ],
  fields: [
    defineField({ name: 'title', title: 'Shoot title', type: 'string', group: 'details', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      group: 'details',
      options: { source: 'title', maxLength: 80 },
      description: 'Click “Generate”. This becomes yoursite.com/work/…',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'client', title: 'Client / store', type: 'string', group: 'details' }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'details',
      description: 'Used for the filters on the Work page. Use the same spelling each time (e.g. “Retail”).',
    }),
    defineField({ name: 'year', title: 'Year', type: 'string', group: 'details' }),
    defineField({
      name: 'date',
      title: 'Date',
      description: 'Sets the order on the Work page — newest first.',
      type: 'date',
      group: 'details',
      initialValue: () => new Date().toISOString().slice(0, 10),
    }),
    defineField({
      name: 'thumbnail',
      title: 'Thumbnail',
      type: 'image',
      group: 'details',
      options: { hotspot: true },
      description: 'Shown on the Work page. Use the crop/hotspot tool to choose which part stays in view.',
    }),
    defineField({ name: 'featured', title: 'Feature on homepage', type: 'boolean', group: 'details', initialValue: false }),
    defineField({ name: 'info', title: 'Shoot info', type: 'text', rows: 5, group: 'details', description: 'Always shown at the top of the shoot page.' }),
    defineField({ ...equipmentField(), group: 'details' }),
    defineField({ ...extraEquipmentField, group: 'details' }),
    defineField({
      name: 'sections',
      title: 'Page sections',
      type: 'array',
      group: 'page',
      description: 'Start empty, add sections in any order, drag to reorder.',
      of: [featureVideo, fullVideo, videoGrid, gallery, fullPhoto, textBlock],
    }),
  ],
  orderings: [{ title: 'Newest first', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] }],
  preview: {
    select: { title: 'title', client: 'client', category: 'category', media: 'thumbnail', featured: 'featured' },
    prepare: ({ title, client, category, media, featured }) => ({
      title: (featured ? '★ ' : '') + (title || 'Untitled shoot'),
      subtitle: [client, category].filter(Boolean).join(' · '),
      media,
    }),
  },
});
