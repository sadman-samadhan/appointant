import { NextRequest, NextResponse } from 'next/server';
import { checkSignupCode } from '@/lib/server/signupCode';
import { rateLimited } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

const AUTH_BACKEND = process.env.AUTH_BACKEND_URL || 'http://3.6.123.11:3302';

// Step 2 of sign-up: checks the emailed code, then makes the account in the Auth Service.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }
  const email = String(body?.email || '').trim();
  const name = String(body?.name || '').trim();
  const password = String(body?.password || '');
  const code = String(body?.code || '').replace(/\D/g, '');
  // A few tries per email, so the code can't be guessed.
  if (rateLimited(`signup-try:${email.toLowerCase()}`, 8, 10 * 60_000)) {
    return NextResponse.json({ message: 'Too many tries. Ask for a new code in a few minutes.' }, { status: 429 });
  }
  const problem = checkSignupCode(email, code, String(body?.ticket || ''));
  if (problem) return NextResponse.json({ message: problem }, { status: 400 });

  try {
    const res = await fetch(`${AUTH_BACKEND}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, userid: email, password }),
      cache: 'no-store',
    });
    if (res.ok) return NextResponse.json({ ok: true });
    const data = await res.json().catch(() => ({}));
    const message =
      res.status === 409 ? 'An account with this email already exists. Sign in, or use "Forgot password".' : data?.message || 'Could not make the account.';
    return NextResponse.json({ message }, { status: res.status });
  } catch {
    return NextResponse.json({ message: 'The sign-in service is unreachable. Please try again shortly.' }, { status: 502 });
  }
}
