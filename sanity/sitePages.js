/* The pages of your website, in menu order, used by the Website setup map (sanity/components/SiteMap.jsx).
   `id` is the page's document; Process steps is a list of documents. */
export const SITE_PAGES = [
  { id: 'homePage', title: 'Home', path: '/', text: 'Your headline, photo and stats. The first thing visitors see.', shape: 'home' },
  { id: 'servicesPage', title: 'Services', path: '/services', text: 'Your three services, and why clients choose you.', shape: 'services' },
  { id: 'aboutPage', title: 'About', path: '/about', text: 'Your story, your values and the kit you shoot with.', shape: 'about' },
  { id: 'processPage', title: 'Process', path: '/process', text: 'The headline and the questions clients ask.', shape: 'process' },
  { id: 'processStep', title: 'Process steps', path: '/process', text: 'Each step of how you work, in order.', shape: 'steps', list: true },
  { id: 'workPage', title: 'Work page', path: '/work', text: 'The heading, and how your shoots are laid out.', shape: 'work' },
  { id: 'contactPage', title: 'Contact', path: '/contact', text: 'Your details, the enquiry form and questions.', shape: 'contact' },
  { id: 'siteSettings', title: 'Logo & footer', path: '/', text: 'Your logo, the footer and the call-to-action band, shown on every page.', shape: 'brand' },
];

/* Titles shown above each page's editor */
export const SINGLETON_TITLES = {
  homePage: 'Home page',
  servicesPage: 'Services page',
  aboutPage: 'About page',
  processPage: 'Process page',
  workPage: 'Work page layout',
  contactPage: 'Contact page',
  siteSettings: 'Logo & footer',
};
