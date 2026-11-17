import { defineArrayMember, defineField, defineType } from 'sanity';
import {
  COST_CATEGORIES,
  KINDS,
  LINK_KINDS,
  LOCATION_TYPES,
  RATE_UNITS,
  ROLES,
  STATUSES,
  TIME_OPTIONS,
  UNITS,
  fmtDay,
  statusOf,
} from '../bookingData';
import { EquipmentTickInput } from '../components/EquipmentTickInput';
import {
  BudgetSummaryInput,
  ClientInput,
  CostsInput,
  LinksInput,
  LocationsInput,
  NotesInput,
  PaymentsInput,
  PeopleInput,
  QuoteInput,
  ScheduleInput,
  ShotListInput,
} from '../components/BookingInputs';

/* A booked shoot: everything about one job in one place — who it's for, when and where, who's on set,
   the money, the plan, the kit and the notes. Shoots are private: they're never published to the website. */

const str = (name, title, extra = {}) => defineField({ name, title, type: 'string', ...extra });
const txt = (name, title, rows = 3, extra = {}) => defineField({ name, title, type: 'text', rows, ...extra });
const nr = (name, title, extra = {}) => defineField({ name, title, type: 'number', ...extra });
const yes = (name, title, extra = {}) => defineField({ name, title, type: 'boolean', ...extra });
const opts = (list) => list.map(({ value, title }) => ({ value, title }));
const pick = (name, title, list, extra = {}) => str(name, title, { options: { list: opts(list) }, ...extra });
const item = (name, title, fields, preview) => defineArrayMember({ type: 'object', name, title, fields, preview });

const quoteLine = item('quoteLine', 'Line', [str('label', 'What for'), nr('qty', 'Quantity'), nr('rate', 'Price each (£)')], {
  select: { title: 'label', qty: 'qty', rate: 'rate' },
  prepare: ({ title, qty, rate }) => ({ title: title || 'Line', subtitle: rate ? `${qty || 1} × £${rate}` : '' }),
});

const costLine = item(
  'costLine',
  'Cost',
  [
    pick('category', 'Type', COST_CATEGORIES),
    str('label', 'What / who'),
    nr('qty', 'Quantity'),
    pick('unit', 'Per', UNITS),
    nr('rate', 'Cost (£)'),
    yes('clientPays', 'Client pays this'),
    yes('paid', 'Paid'),
    str('notes', 'Notes'),
  ],
  { select: { title: 'label', subtitle: 'category' } }
);

const location = item(
  'location',
  'Location',
  [
    str('name', 'Place'),
    pick('kind', 'Type', LOCATION_TYPES),
    txt('address', 'Address', 2),
    str('contact', 'Contact there'),
    str('phone', 'Their phone'),
    nr('hireFee', 'Hire fee (£)'),
    yes('clientPays', 'Client pays this'),
    yes('paid', 'Paid'),
    txt('notes', 'Access, parking & permits', 2),
  ],
  { select: { title: 'name', subtitle: 'address' } }
);

const person = item(
  'person',
  'Person',
  [
    pick('role', 'Role', ROLES),
    str('name', 'Name'),
    str('agency', 'Agency'),
    str('phone', 'Phone'),
    str('email', 'Email'),
    nr('rate', 'Rate (£)'),
    pick('rateUnit', 'Rate is', RATE_UNITS),
    nr('qty', 'Days / hours'),
    yes('clientPays', 'Client pays this'),
    yes('paid', 'Paid'),
    yes('release', 'Release form signed'),
    str('notes', 'Notes'),
  ],
  { select: { title: 'name', subtitle: 'role' } }
);

const payment = item('payment', 'Payment', [defineField({ name: 'date', title: 'Date', type: 'date' }), nr('amount', 'Amount (£)'), str('label', 'What for')], {
  select: { title: 'label', amount: 'amount', date: 'date' },
  prepare: ({ title, amount, date }) => ({ title: title || 'Payment', subtitle: [amount ? `£${amount}` : '', date].filter(Boolean).join(' · ') }),
});

const slot = item('slot', 'Time slot', [str('time', 'Time'), str('text', 'What’s happening')], { select: { title: 'text', subtitle: 'time' } });
const shot = item('shot', 'Shot', [str('text', 'Shot'), yes('done', 'Got it')], { select: { title: 'text' } });
const note = item('note', 'Note', [defineField({ name: 'date', title: 'Date', type: 'date' }), txt('text', 'Note', 3)], { select: { title: 'text', subtitle: 'date' } });
const link = item('link', 'Link', [pick('kind', 'Type', LINK_KINDS), str('label', 'Name'), str('url', 'Link')], { select: { title: 'label', subtitle: 'url' } });

export const booking = defineType({
  name: 'booking',
  title: 'Booked shoot',
  type: 'document',
  // the dashboard shows its own header card instead (sanity/components/BookingHero.jsx)
  __experimental_formPreviewTitle: false,
  groups: [
    { name: 'overview', title: 'Overview', default: true },
    { name: 'places', title: 'Locations' },
    { name: 'crew', title: 'People' },
    { name: 'money', title: 'Budget' },
    { name: 'plan', title: 'Plan & kit' },
    { name: 'files', title: 'Notes & files' },
  ],
  fieldsets: [
    { name: 'job', title: 'The shoot', description: 'A name you’ll recognise, where it’s up to, and what you’re shooting.' },
    { name: 'when', title: 'When', description: 'It appears on your calendar on these days.', options: { columns: 2 } },
    { name: 'delivery', title: 'Delivery', description: 'What the client gets, and when it’s due.' },
  ],
  fields: [
    /* ---------- Overview ---------- */
    str('title', 'Shoot name', { group: 'overview', fieldset: 'job', placeholder: 'e.g. Ink Heaven — autumn product shoot' }),
    str('status', 'Where it’s up to', {
      group: 'overview',
      fieldset: 'job',
      initialValue: 'pencilled',
      options: { list: STATUSES.map(({ value, title }) => ({ value, title })), layout: 'radio', direction: 'horizontal' },
    }),
    str('kind', 'Type of shoot', { group: 'overview', fieldset: 'job', options: { list: KINDS, layout: 'radio', direction: 'horizontal' } }),

    defineField({
      name: 'client',
      title: 'Who it’s for',
      type: 'object',
      group: 'overview',
      description: 'Match the enquiry it came from and their details, budget and message come across automatically.',
      components: { input: ClientInput },
      options: { columns: 2 },
      fields: [
        defineField({ name: 'enquiry', title: 'Enquiry', type: 'reference', to: [{ type: 'enquiry' }], weak: true, hidden: true }),
        str('name', 'Name', { placeholder: 'e.g. Sarah Cole' }),
        str('company', 'Business', { placeholder: 'e.g. Ink Heaven' }),
        str('email', 'Email', { placeholder: 'name@business.co.uk' }),
        str('phone', 'Phone', { placeholder: 'e.g. 07700 900123' }),
        str('budget', 'Their budget', { description: 'What they told you they can spend.', placeholder: 'e.g. £1,000–£2,500' }),
        str('service', 'What they asked for', { placeholder: 'e.g. Product photography' }),
        txt('message', 'Their enquiry', 4, { hidden: true }),
        defineField({ name: 'enquiredAt', title: 'Enquired', type: 'datetime', hidden: true }),
      ],
    }),

    defineField({
      name: 'date',
      title: 'Shoot day',
      type: 'date',
      group: 'overview',
      fieldset: 'when',
      options: { dateFormat: 'ddd D MMM YYYY' },
      validation: (r) => r.required().warning('Add a date so it shows on your calendar.'),
    }),
    defineField({
      name: 'endDate',
      title: 'Last day',
      type: 'date',
      group: 'overview',
      fieldset: 'when',
      description: 'Only if it runs over more than one day.',
      options: { dateFormat: 'ddd D MMM YYYY' },
      validation: (r) =>
        r.custom((end, ctx) => (end && ctx.document && ctx.document.date && end < ctx.document.date ? 'The last day is before the first day.' : true)).warning(),
    }),
    str('startTime', 'Start', { group: 'overview', fieldset: 'when', options: { list: TIME_OPTIONS } }),
    str('endTime', 'Finish', { group: 'overview', fieldset: 'when', options: { list: TIME_OPTIONS } }),

    /* ---------- Locations ---------- */
    defineField({
      name: 'locations',
      title: 'Locations',
      type: 'array',
      group: 'places',
      description: 'Every place you’re shooting. Hire fees count towards your costs automatically.',
      of: [location],
      components: { input: LocationsInput },
    }),

    /* ---------- People ---------- */
    defineField({
      name: 'people',
      title: 'Cast & crew',
      type: 'array',
      group: 'crew',
      description: 'Models, actors, assistants, makeup — anyone on the shoot. Their fees count towards your costs automatically.',
      of: [person],
      components: { input: PeopleInput },
    }),

    /* ---------- Budget ---------- */
    str('numbers', 'The numbers', {
      group: 'money',
      description: 'Worked out from everything on this shoot — your price, locations, people and costs.',
      components: { input: BudgetSummaryInput },
    }),
    defineField({
      name: 'quote',
      title: 'What you’re charging',
      type: 'array',
      group: 'money',
      description: 'Your price, line by line. Add a line with a minus figure for a discount.',
      of: [quoteLine],
      components: { input: QuoteInput },
    }),
    defineField({
      name: 'costs',
      title: 'Other costs',
      type: 'array',
      group: 'money',
      description: 'Studio or kit hire, travel, props, food — anything else you pay for. Location and people fees are added from their tabs.',
      of: [costLine],
      components: { input: CostsInput },
    }),
    nr('budgetAmount', 'Their budget (£)', {
      group: 'money',
      description: 'Used to check your price against what they can spend. Leave empty to use the budget from their enquiry.',
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'payments',
      title: 'Payments received',
      type: 'array',
      group: 'money',
      description: 'Deposits and payments from the client — what’s still owed is worked out for you.',
      of: [payment],
      components: { input: PaymentsInput },
    }),

    /* ---------- Plan & kit ---------- */
    txt('brief', 'The brief', 5, {
      group: 'plan',
      description: 'What you’re shooting, the look they want, and what it’s for.',
      placeholder: 'e.g. New autumn range for their website and Instagram — bright, natural light, close-up product detail.',
    }),
    defineField({
      name: 'schedule',
      title: 'Schedule for the day',
      type: 'array',
      group: 'plan',
      description: 'Your call sheet: when everyone arrives and what happens when.',
      of: [slot],
      components: { input: ScheduleInput },
    }),
    defineField({
      name: 'shotList',
      title: 'Shot list',
      type: 'array',
      group: 'plan',
      description: 'Tick shots off on the day.',
      of: [shot],
      components: { input: ShotListInput },
    }),
    defineField({
      name: 'kit',
      title: 'Kit to bring',
      type: 'array',
      group: 'plan',
      description: 'Tick from your equipment list. Hired kit goes under Budget → Other costs.',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'equipment' }], weak: true })],
      components: { input: EquipmentTickInput },
    }),
    txt('deliverables', 'What they’ll get', 3, { group: 'plan', fieldset: 'delivery', placeholder: 'e.g. 40 edited photos and one 60-second video' }),
    defineField({ name: 'deliveryDate', title: 'Due to the client by', type: 'date', group: 'plan', fieldset: 'delivery', options: { dateFormat: 'ddd D MMM YYYY' } }),

    /* ---------- Notes & files ---------- */
    defineField({
      name: 'notes',
      title: 'Notes from the client',
      type: 'array',
      group: 'files',
      description: 'Anything they tell you along the way — newest at the top.',
      of: [note],
      components: { input: NotesInput },
    }),
    defineField({
      name: 'links',
      title: 'Links & files',
      type: 'array',
      group: 'files',
      description: 'Moodboards, contracts, invoices, galleries — paste the link.',
      of: [link],
      components: { input: LinksInput },
    }),
  ],
  orderings: [
    { title: 'Shoot date, soonest first', name: 'dateAsc', by: [{ field: 'date', direction: 'asc' }] },
    { title: 'Shoot date, latest first', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'title', name: 'client.name', company: 'client.company', date: 'date', status: 'status', start: 'startTime' },
    prepare: ({ title, name, company, date, status, start }) => ({
      title: title || company || name || 'New shoot',
      subtitle: [date ? fmtDay(date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'No date yet', start, statusOf(status).title]
        .filter(Boolean)
        .join(' · '),
    }),
  },
});
