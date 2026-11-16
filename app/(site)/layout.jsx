import Footer from '@/components/Footer';
import Header from '@/components/Header';
import RevealObserver from '@/components/RevealObserver';
import { getSettings } from '@/lib/content';

export const revalidate = 30;

export default async function SiteLayout({ children }) {
  const settings = await getSettings();
  return (
    <div className="site">
      <Header settings={settings} />
      <main>{children}</main>
      <Footer settings={settings} />
      <RevealObserver />
    </div>
  );
}
