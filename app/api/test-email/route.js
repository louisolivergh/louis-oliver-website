import { NextResponse } from 'next/server';
import { notify } from '@/lib/notify';

export const dynamic = 'force-dynamic';

/* Sends a sample enquiry email to your NOTIFY_EMAIL address (never to anyone else). */
export async function POST(req) {
  const result = await notify(
    {
      name: 'Test enquiry',
      company: 'Louis Oliver website',
      email: process.env.NOTIFY_EMAIL || 'contact@louisoliver.co.uk',
      details: 'This is a test from the setup check page. If you can read this, enquiry emails are working.',
    },
    new URL(req.url).origin
  );
  return NextResponse.json(result || { ok: false, reason: 'No result' });
}
