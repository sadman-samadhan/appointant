import { NextRequest, NextResponse } from 'next/server';
import { accountFromRequest, listAccountBookings } from '@/lib/server/customerAccount';
import { agentConfigured } from '@/lib/server/shopAgent';

export const dynamic = 'force-dynamic';

// The signed-in customer's own bookings.
export async function GET(req: NextRequest) {
  const account = await accountFromRequest(req);
  if (!account) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401 });
  if (!agentConfigured()) return NextResponse.json({ message: 'Bookings are not available right now.' }, { status: 503 });
  try {
    return NextResponse.json({ bookings: await listAccountBookings(account) });
  } catch (err) {
    console.error('[account-bookings] failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ message: 'Could not load your appointments. Please try again.' }, { status: 502 });
  }
}
