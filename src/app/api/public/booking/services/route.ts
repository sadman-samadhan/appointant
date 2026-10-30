import { NextResponse } from 'next/server';
import { listBarbers, listBookableServices, shopToday } from '@/lib/server/onlineBooking';
import { AgentError, agentConfigured } from '@/lib/server/shopAgent';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!agentConfigured()) {
    return NextResponse.json({ message: 'Online booking is not set up yet.' }, { status: 503 });
  }
  try {
    const [services, barbers] = await Promise.all([listBookableServices(), listBarbers().catch(() => [])]);
    return NextResponse.json({ services, barbers, today: shopToday() });
  } catch (err) {
    const status = err instanceof AgentError ? err.status : 502;
    return NextResponse.json({ message: 'Could not load services. Please try again.' }, { status: status >= 500 ? status : 502 });
  }
}
