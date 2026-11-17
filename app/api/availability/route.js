import { createClient } from 'next-sanity';
import { NextResponse } from 'next/server';
import { apiVersion, dataset, projectId } from '@/sanity/env';
import { CALL_MINUTES, openTimes } from '@/lib/calls';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/* The free times the enquiry form offers for a call. Only the free hours leave the server, never what's booked. */
export async function GET() {
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!projectId || !token) return NextResponse.json({ on: false, days: [] }, { headers: NO_STORE });
  try {
    const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false, perspective: 'raw' });
    const { settings, days } = await openTimes(client);
    return NextResponse.json({ on: settings.on, minutes: CALL_MINUTES, days: settings.on ? days : [] }, { headers: NO_STORE });
  } catch (err) {
    console.error('Call times failed', err);
    return NextResponse.json({ on: false, days: [] }, { headers: NO_STORE });
  }
}
