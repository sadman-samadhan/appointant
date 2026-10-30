import { NextRequest, NextResponse } from 'next/server';
import { accountFromRequest, rescheduleAccountBooking } from '@/lib/server/customerAccount';
import { AgentError, agentConfigured } from '@/lib/server/shopAgent';

export const dynamic = 'force-dynamic';

// The signed-in customer moves one of their own bookings (up to 24 hours before).
export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const account = await accountFromRequest(req);
  if (!account) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401 });
  if (!agentConfigured()) return NextResponse.json({ message: 'Please call us to change your appointment.' }, { status: 503 });
  const { bookingId } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const id = await rescheduleAccountBooking(account, bookingId, String(body?.date || ''), String(body?.startTime || ''));
    return NextResponse.json({ bookingId: id });
  } catch (err) {
    if (err instanceof AgentError && [400, 404, 409].includes(err.status)) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error('[account-reschedule] failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ message: 'Could not change your appointment. Please try again or call us.' }, { status: 502 });
  }
}
