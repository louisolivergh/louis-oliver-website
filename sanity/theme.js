import { buildLegacyTheme } from 'sanity';

/* Dashboard colours matched to the website */
const brand = '#104de6';
const ink = '#0b1220';

export const theme = buildLegacyTheme({
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
