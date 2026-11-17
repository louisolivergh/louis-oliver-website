/* Making and saving company and client records from the Clients page, the company picker and the
   Save buttons. Records are created as drafts and never published, so they stay private. */

const API = '2024-10-01';
export { API as CLIENTS_API };

export function newId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export const newKey = () => Math.random().toString(36).slice(2, 12);
export const todayDay = () => new Date().toISOString().slice(0, 10);
export const companyRef = (id) => ({ _type: 'reference', _ref: String(id).replace(/^drafts\./, ''), _weak: true });
const strings = (list) => (Array.isArray(list) ? list.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : []);

/** a new company record. saved: false leaves it to be saved along with the client being made */
export async function createCompany(client, { name, aliases, category, addedAt, saved = true } = {}) {
  const id = newId();
  await client.create({
    _id: `drafts.${id}`,
    _type: 'company',
    name: String(name || '').trim(),
    addedAt: addedAt || todayDay(),
    ...(strings(aliases).length ? { aliases: strings(aliases) } : {}),
    ...(category ? { category } : {}),
    ...(saved ? { savedAt: new Date().toISOString() } : {}),
  });
  return id;
}

/** a client record from the first version (a whole company in one record) becomes a proper company */
export async function promoteLegacy(client, legacy, extra = {}) {
  const category = 'category' in extra ? extra.category : legacy.category;
  const id = await createCompany(client, { name: legacy.name, aliases: legacy.aliases, category, addedAt: legacy.addedAt });
  const base = String(legacy._baseId || legacy._id).replace(/^drafts\./, '');
  const patch = {};
  if (legacy.website) patch.website = legacy.website;
  if (legacy.notes) patch.notes = legacy.notes;
  if (Object.keys(patch).length) await client.patch(`drafts.${id}`).set(patch).commit();
  // its people become clients of the new company
  for (const p of Array.isArray(legacy.contacts) ? legacy.contacts : []) {
    if (p && String(p.name || '').trim()) await createClient(client, { name: p.name, role: p.role, emails: p.emails, phones: p.phones, companyId: id });
  }
  await Promise.all([`drafts.${base}`, base].map((x) => client.delete(x).catch(() => null)));
  return id;
}

/** the record for a company on the Clients page, made (and saved) if it was only found from your shoots.
    extra: changes to make at the same time, e.g. { category }. Returns the record's id */
export async function ensureCompany(client, c, extra = {}) {
  if (c.saved && !c.saved.legacy) {
    const id = c.saved._baseId;
    const changes = Object.keys(extra);
    if (changes.length) {
      const target = c.saved._isDraft === false ? id : `drafts.${id}`;
      const set = {};
      const unset = [];
      changes.forEach((k) => (extra[k] ? (set[k] = extra[k]) : unset.push(k)));
      let p = client.patch(target);
      if (Object.keys(set).length) p = p.set(set);
      if (unset.length) p = p.unset(unset);
      await p.commit();
    }
    return id;
  }
  if (c.saved && c.saved.legacy) return promoteLegacy(client, c.saved, extra);
  const category = 'category' in extra ? extra.category : c.category;
  return createCompany(client, { name: c.name, aliases: c.otherNames, category, addedAt: c.addedAt });
}

/** a client record from the first version (one person, details kept in a list) tidied into the new shape */
export async function tidyLegacyPerson(client, d) {
  if (!d || !d.kind) return;
  const id = d._baseId || String(d._id || '').replace(/^drafts\./, '');
  const contacts = Array.isArray(d.people) ? d.people : [];
  const emails = [...new Set([...strings(d.emails), ...contacts.flatMap((p) => strings(p && p.emails))])];
  const phones = [...new Set([...strings(d.phones), ...contacts.flatMap((p) => strings(p && p.phones))])];
  const role = String(d.role || (contacts[0] && contacts[0].role) || '').trim();
  await client
    .patch(d._isDraft === false ? id : `drafts.${id}`)
    .set({ savedAt: d.savedAt || new Date().toISOString(), ...(emails.length ? { emails } : {}), ...(phones.length ? { phones } : {}), ...(role ? { role } : {}) })
    .unset(['kind', 'people'])
    .commit();
}

/** a client record for one person */
export async function createClient(client, { name, role, emails, phones, companyId, addedAt, notes } = {}) {
  const id = newId();
  await client.create({
    _id: `drafts.${id}`,
    _type: 'client',
    name: String(name || '').trim(),
    addedAt: addedAt || todayDay(),
    savedAt: new Date().toISOString(),
    ...(role ? { role: String(role).trim() } : {}),
    ...(strings(emails).length ? { emails: strings(emails) } : {}),
    ...(strings(phones).length ? { phones: strings(phones) } : {}),
    ...(notes ? { notes } : {}),
    ...(companyId ? { company: companyRef(companyId) } : {}),
  });
  return id;
}

/** when a client is saved, the company they belong to counts from then on too */
export async function saveCompanyOf(client, ref) {
  const id = String((ref && ref._ref) || ref || '').replace(/^drafts\./, '');
  if (!id) return;
  const docs = (await client.fetch('*[_id in [$id, "drafts." + $id]]{ _id, savedAt }', { id })) || [];
  const now = new Date().toISOString();
  await Promise.all(docs.filter((d) => d && !d.savedAt).map((d) => client.patch(d._id).set({ savedAt: now }).commit()));
}

/** open a new client, already in this company */
export function addPersonTo(router, companyId) {
  router.navigateIntent('create', [{ type: 'client', template: 'client-in-company' }, { companyId: String(companyId).replace(/^drafts\./, '') }]);
}
