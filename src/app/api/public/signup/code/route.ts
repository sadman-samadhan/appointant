import { NextRequest, NextResponse } from 'next/server';
import { clientIp, rateLimited } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

const AUTH_BACKEND = process.env.AUTH_BACKEND_URL || 'http://3.6.123.11:3302';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Step 1 of sign-up: the Auth Service emails a 4-digit code to the address.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }
  const email = String(body?.email || '').trim();
  const name = String(body?.name || '').trim();
  if (!EMAIL.test(email)) return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 });
  if (name.length < 2) return NextResponse.json({ message: 'Enter your name.' }, { status: 400 });
  if (rateLimited(`signup-code:${clientIp(req)}`, 10, 60 * 60_000) || rateLimited(`signup-code:${email.toLowerCase()}`, 3, 10 * 60_000)) {
    return NextResponse.json({ message: 'Too many codes asked for. Please wait a few minutes and try again.' }, { status: 429 });
  }

  try {
    const res = await fetch(`${AUTH_BACKEND}/auth/register/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userid: email }),
      cache: 'no-store',
    });
    if (res.ok) return NextResponse.json({ ok: true });
    const data = await res.json().catch(() => ({}));
    const message =
      res.status === 409
        ? 'An account with this email already exists. Sign in, or use "Forgot password".'
        : res.status >= 500
          ? 'We couldn’t send the code. Check the email address and try again.'
          : data?.message || 'Could not send the code.';
    return NextResponse.json({ message }, { status: res.status });
  } catch {
    return NextResponse.json({ message: 'The sign-in service is unreachable. Please try again shortly.' }, { status: 502 });
  }
}
