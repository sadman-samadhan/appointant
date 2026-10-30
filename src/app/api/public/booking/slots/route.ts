import { NextRequest, NextResponse } from 'next/server';
import { availability } from '@/lib/server/onlineBooking';
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
    const { free } = await availability(serviceId, date, exclude);
    // Each time with the barbers free then; with a barber chosen, only that barber's times.
    const entries = Array.from(free.entries()).filter(([, ids]) => !staffId || ids.includes(staffId));
    return NextResponse.json({ date, times: entries.map(([t]) => t), barbers: Object.fromEntries(entries) });
  } catch (err) {
    if (err instanceof AgentError && err.status === 400) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error('[booking-slots] failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ message: 'Could not load available times. Please try again.' }, { status: 502 });
  }
}
