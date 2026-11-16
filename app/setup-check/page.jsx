import SetupCheckClient from './SetupCheckClient';
import { dataset, projectId } from '@/sanity/env';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Setup check', robots: { index: false } };

export default function SetupCheck() {
  return (
    <div className="site" style={{ minHeight: '100vh' }}>
      <div className="container" style={{ paddingTop: 80, paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 760 }}>
        <span className="eyebrow">Setup check</span>
        <h1 className="h2">Is the dashboard connected?</h1>
        <SetupCheckClient
          projectId={projectId}
          dataset={dataset}
          hasToken={Boolean(process.env.SANITY_API_WRITE_TOKEN)}
        />
      </div>
    </div>
  );
}
