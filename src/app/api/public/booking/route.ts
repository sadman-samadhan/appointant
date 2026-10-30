import { NextRequest, NextResponse } from 'next/server';
import { placeOnlineBooking, validateGuestBooking, STRICT_BOOKING_CHECKS } from '@/lib/server/onlineBooking';
import { accountFromRequest, getAccountDetails, updateAccountDetails } from '@/lib/server/customerAccount';
import { formatPhone, isValidPhone, PHONE_ERROR } from '@/lib/phone';
import { AgentError, agentConfigured } from '@/lib/server/shopAgent';
import { clientIp, rateLimited } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

// Online booking: the shop's server account books on the customer's behalf. A signed-in
// customer's booking is linked to their account. The booking is created as DRAFT; the shop
// confirms it in Admin → Appointments.
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

  if (STRICT_BOOKING_CHECKS && rateLimited(`book:${clientIp(req)}`, 5, 60 * 60_000)) {
    return NextResponse.json(
      { message: 'Too many bookings from this device. Please call us to book.' },
      { status: 429 }
    );
  }

  try {
    // A signed-in customer books with the name, phone and email on their account. If the
    // account has no phone yet, the one typed here is saved to it.
    const account = await accountFromRequest(req);
    if (account) {
      const details = await getAccountDetails(account);
      let phone = details.phone;
      if (!phone) {
        if (!isValidPhone(body?.phone)) return NextResponse.json({ message: PHONE_ERROR }, { status: 400 });
        phone = formatPhone(body.phone);
        await updateAccountDetails(account, { name: details.name, phone });
      }
      body = { ...body, name: details.name, phone, email: details.email };
    }

    const { value, error } = validateGuestBooking(body);
    if (!value) return NextResponse.json({ message: error }, { status: 400 });

    const result = await placeOnlineBooking(value, account);
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
