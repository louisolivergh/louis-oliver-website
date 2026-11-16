import { equipment } from './equipment';
import { shoot, videoItem } from './shoot';
import { aboutPage, contactPage, enquiry, homePage, processPage, processStep, servicesPage, siteSettings, workPage } from './pages';

export const SINGLETONS = ['siteSettings', 'homePage', 'servicesPage', 'aboutPage', 'processPage', 'workPage', 'contactPage'];

export const schemaTypes = [
  siteSettings,
  homePage,
  servicesPage,
  aboutPage,
  processPage,
  workPage,
  contactPage,
  shoot,
  videoItem,
  equipment,
  processStep,
  enquiry,
];
