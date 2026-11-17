/* Making and saving company and client records from the Clients page, the company picker and the
   Save buttons. Records are created as drafts and never published, so they stay private. */

import { nameKey, orgKey, phoneKey } from '../clientData';

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
const arr = (v) => (Array.isArray(v) ? v : []);

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

/* ---------- merging (from the Merge button on a company or a person) ---------- */

const uniqBy = (list, key) => {
  const seen = new Set();
  return list.filter((x) => {
    const k = key(x);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};
/** every name in names except the one kept, once each (same means same by `key`) */
const otherNamesOf = (names, keepName, key) => uniqBy(strings(names).filter((n) => key(n) && key(n) !== key(keepName)), key);
const firstDay = (...days) => days.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)).map((d) => d.slice(0, 10)).sort()[0] || '';

/**
 * Two companies become one: `other` goes into `keep` (both as they appear on the Clients page).
 * Every name either one has gone by becomes one of its other names, so their shoots and enquiries all
 * come under it. Details it doesn't have yet come across; ones that differ are kept in its notes. The
 * people saved under the other company move across, and its record goes. Returns the kept record's id.
 */
export async function mergeCompanies(client, keep, other, name) {
  const id = await ensureCompany(client, keep);
  const cur = (await client.fetch('*[_id in [$id, "drafts." + $id]] | order(_updatedAt desc)[0]{ _id, name, aliases, category, website, email, phone, address, notes, addedAt }', { id })) || {};
  const o = other.saved || {};
  const keepName = String(name || cur.name || keep.name || '').trim();
  const set = {
    name: keepName,
    aliases: otherNamesOf([cur.name, keep.name, ...arr(keep.otherNames), ...arr(cur.aliases), other.name, ...arr(other.otherNames), ...arr(o.aliases)], keepName, orgKey),
  };
  const differs = [];
  [['website', 'Website'], ['email', 'Email'], ['phone', 'Phone'], ['address', 'Address']].forEach(([k, label]) => {
    const theirs = String(o[k] || other[k] || '').trim();
    const ours = String(cur[k] || '').trim();
    if (!theirs) return;
    if (!ours) set[k] = theirs;
    else if (ours.toLowerCase() !== theirs.toLowerCase()) differs.push(`${label}: ${theirs}`);
  });
  if (!cur.category && (o.category || other.category)) set.category = o.category || other.category;
  const theirNotes = String(o.notes || '').trim();
  if (differs.length || theirNotes) set.notes = [String(cur.notes || '').trim(), [`From ${other.name}:`, ...differs, theirNotes].filter(Boolean).join('\n')].filter(Boolean).join('\n\n');
  const added = firstDay(cur.addedAt, o.addedAt, other.addedAt);
  if (added) set.addedAt = added;
  await client.patch(cur._id || `drafts.${id}`).set(set).commit();

  const gone = [o, ...arr(other.alsoSaved)].filter((d) => d && d._baseId && d._baseId !== id);
  const goneIds = gone.map((d) => d._baseId);
  if (goneIds.length) {
    const people = (await client.fetch('*[_type == "client" && company._ref in $ids]._id', { ids: goneIds })) || [];
    await Promise.all(people.map((pid) => client.patch(pid).set({ company: companyRef(id) }).commit()));
  }
  for (const d of gone) {
    if (!d.legacy) continue;
    for (const p of arr(d.contacts)) {
      if (p && String(p.name || '').trim()) await createClient(client, { name: p.name, role: p.role, emails: p.emails, phones: p.phones, companyId: id });
    }
  }
  await Promise.all(goneIds.flatMap((x) => [`drafts.${x}`, x]).map((x) => client.delete(x).catch(() => null)));
  return id;
}

/**
 * Two people become one client: `other` goes into `keep` (both as on the Clients page). Every email
 * address, phone number and name either has used is kept, so all their shoots and enquiries come
 * together. company: the company `keep` is shown under (null for none). otherCompany: the other
 * person's, which `keep` joins if they had none. Returns { person, company } ids.
 */
export async function mergeClients(client, keep, other, { company = null, otherCompany = null, name } = {}) {
  let companyId = '';
  let id;
  if (keep.saved && !keep.saved.kind) id = keep.saved._baseId;
  else if (keep.saved) {
    await tidyLegacyPerson(client, keep.saved);
    id = keep.saved._baseId;
  } else {
    companyId = company ? await ensureCompany(client, company) : '';
    id = await createClient(client, { name: keep.name, role: keep.roles[0], emails: keep.emails, phones: keep.phones, companyId, addedAt: keep.addedAt });
  }
  const cur = (await client.fetch('*[_id in [$id, "drafts." + $id]] | order(_updatedAt desc)[0]{ _id, name, role, emails, phones, aliases, notes, addedAt, company }', { id })) || {};
  const o = other.saved || {};
  const keepName = String(name || cur.name || keep.name || '').trim();
  const set = {
    name: keepName,
    aliases: otherNamesOf([cur.name, keep.name, ...arr(keep.otherNames), ...arr(cur.aliases), other.name, ...arr(other.otherNames), ...arr(o.aliases)], keepName, nameKey),
    emails: uniqBy(strings([...arr(cur.emails), ...arr(keep.emails), ...arr(other.emails)]), (e) => e.toLowerCase()),
    phones: uniqBy(strings([...arr(cur.phones), ...arr(keep.phones), ...arr(other.phones)]), (t) => phoneKey(t) || t.replace(/\D/g, '')),
  };
  if (!String(cur.role || '').trim() && arr(other.roles)[0]) set.role = other.roles[0];
  const theirNotes = String(o.notes || '').trim();
  if (theirNotes) set.notes = [String(cur.notes || '').trim(), `From ${other.name}:\n${theirNotes}`].filter(Boolean).join('\n\n');
  const added = firstDay(cur.addedAt, o.addedAt, other.addedAt);
  if (added) set.addedAt = added;
  // someone with no company yet joins the other person's
  if (!(cur.company && cur.company._ref) && !companyId && !company && otherCompany) {
    companyId = await ensureCompany(client, otherCompany);
    set.company = companyRef(companyId);
  }
  await client.patch(cur._id || `drafts.${id}`).set(set).commit();
  const gone = [o, ...arr(other.alsoSaved)].filter((d) => d && d._baseId && d._baseId !== id);
  await Promise.all(gone.flatMap((d) => [`drafts.${d._baseId}`, d._baseId]).map((x) => client.delete(x).catch(() => null)));
  return { person: id, company: companyId };
}
