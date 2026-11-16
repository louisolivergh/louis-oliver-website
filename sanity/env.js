/* Cleans up the values from Vercel so a stray space, line break or capital letter can't break the build. */
const rawProjectId = String(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '');
const cleanedId = rawProjectId.trim().toLowerCase().replace(/\s+/g, '');

export const projectIdLooksValid = /^[a-z0-9][a-z0-9-]*$/.test(cleanedId);
export const projectId = projectIdLooksValid ? cleanedId : '';
export const projectIdProblem = !rawProjectId.trim()
  ? 'missing'
  : !projectIdLooksValid
    ? 'invalid'
    : rawProjectId !== cleanedId
      ? 'cleaned'
      : '';
export const dataset = String(process.env.NEXT_PUBLIC_SANITY_DATASET || 'production').trim().toLowerCase() || 'production';
export const apiVersion = '2024-10-01';
export const isConfigured = Boolean(projectId);
