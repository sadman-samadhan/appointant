import { NextRequest, NextResponse } from 'next/server';
import { freeTimes } from '@/lib/server/onlineBooking';
import { AgentError, agentConfigured } from '@/lib/server/shopAgent';
import { clientIp, rateLimited } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!agentConfigured()) {
    return NextResponse.json({ message: 'Online booking is not set up yet.' }, { status: 503 });
  }
  if (rateLimited(`slots:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ message: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }
  const serviceId = req.nextUrl.searchParams.get('serviceId') || '';
  const date = req.nextUrl.searchParams.get('date') || '';
  // When a customer moves a booking, its own time counts as free.
  const exclude = req.nextUrl.searchParams.get('exclude') || undefined;
  const staffId = req.nextUrl.searchParams.get('staffId') || undefined;
  try {
    return NextResponse.json({ date, times: await freeTimes(serviceId, date, exclude, staffId) });
  } catch (err) {
    if (err instanceof AgentError && err.status === 400) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error('[booking-slots] failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ message: 'Could not load available times. Please try again.' }, { status: 502 });
  }
}
