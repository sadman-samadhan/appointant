import { NextRequest, NextResponse } from 'next/server';
import { placeGuestBooking, validateGuestBooking } from '@/lib/server/onlineBooking';
import { AgentError, agentConfigured } from '@/lib/server/shopAgent';
import { clientIp, rateLimited } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

// Guest online booking: the shop's server account books on the customer's behalf.
// The booking is created as DRAFT; the shop confirms it in Admin → Appointments.
export async function POST(req: NextRequest) {
  if (!agentConfigured()) {
    return NextResponse.json({ message: 'Online booking is not set up yet. Please call us.' }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }

  // Hidden form field that only bots fill in.
  if (body?.website) {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }

  if (rateLimited(`book:${clientIp(req)}`, 5, 60 * 60_000)) {
    return NextResponse.json(
      { message: 'Too many bookings from this device. Please call us to book.' },
      { status: 429 }
    );
  }

  const { value, error } = validateGuestBooking(body);
  if (!value) return NextResponse.json({ message: error }, { status: 400 });

  try {
    const result = await placeGuestBooking(value);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof AgentError && [400, 409].includes(err.status)) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error('[online-booking] failed', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { message: 'We could not complete your booking. Please try again or call us.' },
      { status: 502 }
    );
  }
}
