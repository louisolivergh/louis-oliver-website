import SetupCheckClient from './SetupCheckClient';
import { dataset, projectId, projectIdProblem } from '@/sanity/env';

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
          problem={projectIdProblem}
          dataset={dataset}
          hasToken={Boolean(process.env.SANITY_API_WRITE_TOKEN)}
          email={{
            hasKey: Boolean(process.env.RESEND_API_KEY),
            to: process.env.NOTIFY_EMAIL || 'contact@louisoliver.co.uk (default)',
            from: process.env.NOTIFY_FROM || 'onboarding@resend.dev (default — set NOTIFY_FROM)',
            site: process.env.SITE_URL || '(not set — uses this address)',
          }}
        />
      </div>
    </div>
  );
}
