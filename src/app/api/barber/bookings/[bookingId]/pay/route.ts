import { NextRequest, NextResponse } from 'next/server';
import { barberAmountDue, barberFromRequest, barberTakePayment } from '@/lib/server/barberPayment';
import { AgentError, agentConfigured } from '@/lib/server/shopAgent';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ bookingId: string }> };

function failure(err: unknown, what: string) {
  if (err instanceof AgentError && [400, 401, 403, 404].includes(err.status)) {
    return NextResponse.json({ message: err.message }, { status: err.status });
  }
  console.error(`[barber-pay] ${what} failed`, err instanceof Error ? err.message : err);
  return NextResponse.json({ message: 'Could not take the payment. Please try again or ask the owner.' }, { status: 502 });
}

// A barber's own arrived appointment: what the customer owes.
export async function GET(req: NextRequest, { params }: Ctx) {
  if (!agentConfigured()) return NextResponse.json({ message: 'Ask the owner to take the payment.' }, { status: 503 });
  try {
    const barber = await barberFromRequest(req);
    return NextResponse.json({ totalDue: await barberAmountDue(barber, (await params).bookingId) });
  } catch (err) {
    return failure(err, 'bill');
  }
}

// The barber takes the payment; it is recorded as taken by them.
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!agentConfigured()) return NextResponse.json({ message: 'Ask the owner to take the payment.' }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const tip = Math.max(0, Number(body?.tip) || 0);
  try {
    const barber = await barberFromRequest(req);
    const paid = await barberTakePayment(barber, (await params).bookingId, tip);
    return NextResponse.json({ paid, takenBy: barber.name });
  } catch (err) {
    return failure(err, 'payment');
  }
}
