import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="site" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 120, paddingBottom: 120 }}>
        <span className="eyebrow">404</span>
        <h1 className="h1">This page doesn’t exist.</h1>
        <Link href="/" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Back to home</Link>
      </div>
    </div>
  );
}
