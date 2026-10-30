import { NextRequest, NextResponse } from 'next/server';
import { accountFromRequest, getAccountDetails, updateAccountDetails } from '@/lib/server/customerAccount';
import { agentConfigured } from '@/lib/server/shopAgent';
import { formatPhone, isValidPhone, PHONE_ERROR } from '@/lib/phone';

export const dynamic = 'force-dynamic';

// The signed-in customer's name and phone, as the shop has them on file.
export async function GET(req: NextRequest) {
  const account = await accountFromRequest(req);
  if (!account) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401 });
  if (!agentConfigured()) return NextResponse.json({ message: 'Your details are not available right now.' }, { status: 503 });
  try {
    return NextResponse.json(await getAccountDetails(account));
  } catch {
    return NextResponse.json({ message: 'Could not load your details. Please try again.' }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  const account = await accountFromRequest(req);
  if (!account) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401 });
  if (!agentConfigured()) return NextResponse.json({ message: 'Your details can not be changed right now.' }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || '').trim().replace(/\s+/g, ' ');
  const phone = String(body?.phone || '').trim();
  if (name.length < 2 || name.length > 80) return NextResponse.json({ message: 'Enter your name.' }, { status: 400 });
  // The phone is optional here: leaving it empty keeps the number on file.
  if (phone && !isValidPhone(phone)) return NextResponse.json({ message: PHONE_ERROR }, { status: 400 });

  try {
    await updateAccountDetails(account, { name, phone: phone ? formatPhone(phone) : undefined });
    return NextResponse.json(await getAccountDetails(account));
  } catch (err) {
    console.error('[account-details] failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ message: 'Could not save your details. Please try again.' }, { status: 502 });
  }
}
