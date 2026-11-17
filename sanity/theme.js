import { buildLegacyTheme } from 'sanity';
import * as uiTheme from '@sanity/ui/theme';

/* Dashboard colours, fonts and corner rounding matched to the website.
   (The finishing touches for the editing areas live in app/studio/studio.css.) */
const brand = '#104de6';
const ink = '#0b1220';

// the website's own fonts, loaded by app/layout.jsx
const BODY = 'var(--font-inter, Inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const DISPLAY = 'var(--font-sora, Sora), var(--font-inter, Inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const legacy = buildLegacyTheme({
  '--font-family-base': BODY,
  '--black': ink,
  '--white': '#ffffff',
  '--gray': '#5b6475',
  '--gray-base': '#5b6475',
  '--component-bg': '#ffffff',
  '--component-text-color': ink,
  '--brand-primary': brand,
  '--default-button-color': '#5b6475',
  '--default-button-primary-color': brand,
  '--default-button-success-color': '#12805c',
  '--default-button-warning-color': '#b7791f',
  '--default-button-danger-color': '#b42318',
  '--state-info-color': brand,
  '--state-success-color': '#12805c',
  '--state-warning-color': '#b7791f',
  '--state-danger-color': '#b42318',
  '--main-navigation-color': ink,
  '--main-navigation-color--inverted': '#ffffff',
  '--focus-color': brand,
});

// headings (like the big title above each page you edit) in the website's display font
const fonts = { ...legacy.fonts, heading: { ...legacy.fonts.heading, family: DISPLAY } };

// softer, rounder corners like the website (Sanity's own default is 0, 1, 3, 6, 9, 12, 21)
const RADIUS = [0, 2, 8, 12, 16, 22, 30];

// The legacy theme can't change corner rounding, so the matching modern theme is built here with the
// same colours and fonts plus the rounder corners. If anything about it is unavailable, the dashboard
// simply keeps Sanity's default corners.
function withRoundCorners() {
  try {
    if (typeof uiTheme.buildTheme !== 'function' || typeof uiTheme.v0_v2 !== 'function') return {};
    const v2 = uiTheme.v0_v2({ ...uiTheme.buildTheme(), v2: undefined, color: legacy.color, fonts, radius: RADIUS });
    return v2 && v2.radius && v2.color ? { v2 } : {};
  } catch {
    return {};
  }
}

export const theme = { ...legacy, fonts, ...withRoundCorners() };
