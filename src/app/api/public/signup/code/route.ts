import { NextRequest, NextResponse } from 'next/server';
import { mailConfigured } from '@/lib/server/mailer';
import { makeSignupCode, sendSignupCode } from '@/lib/server/signupCode';
import { clientIp, rateLimited } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Step 1 of sign-up: emails a 6-digit code and returns the signed ticket that goes with it.
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
  if (!mailConfigured()) {
    return NextResponse.json({ message: 'Email is not set up yet, so accounts can’t be made online. Please call us.' }, { status: 503 });
  }
  if (rateLimited(`signup-code:${clientIp(req)}`, 10, 60 * 60_000) || rateLimited(`signup-code:${email.toLowerCase()}`, 3, 10 * 60_000)) {
    return NextResponse.json({ message: 'Too many codes asked for. Please wait a few minutes and try again.' }, { status: 429 });
  }
  const { code, ticket } = makeSignupCode(email);
  if (!(await sendSignupCode(email, name, code))) {
    return NextResponse.json({ message: 'We couldn’t send the code. Check the email address and try again.' }, { status: 502 });
  }
  return NextResponse.json({ ticket });
}
