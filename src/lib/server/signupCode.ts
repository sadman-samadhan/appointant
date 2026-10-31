import 'server-only';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { BUSINESS } from '@/lib/business';
import { sendMail } from './mailer';

// A 6-digit code emailed at sign-up, so an account is only made for an email its owner reads.
// Nothing is stored: the browser keeps a signed ticket (email, expiry, hash of the code) and
// sends it back with the code.
//   SIGNUP_CODE_SECRET signs the ticket (falls back to the shop agent's password).

const CODE_MINUTES = 10;

function secret(): string {
  const s = process.env.SIGNUP_CODE_SECRET || process.env.BOOKING_AGENT_PASSWORD || '';
  if (!s) throw new Error('Sign-up codes are not set up.');
  return s;
}

const sign = (data: string) => createHmac('sha256', secret()).update(data).digest('base64url');
const codeHash = (email: string, code: string) => sign(`code:${email.toLowerCase()}:${code}`);

/** Makes a code for `email` and the ticket that proves it was sent. */
export function makeSignupCode(email: string): { code: string; ticket: string } {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const body = Buffer.from(
    JSON.stringify({ e: email.toLowerCase(), x: Date.now() + CODE_MINUTES * 60_000, h: codeHash(email, code) })
  ).toString('base64url');
  return { code, ticket: `${body}.${sign(body)}` };
}

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Why the code can't be used, or null when it is right for this email. */
export function checkSignupCode(email: string, code: string, ticket: string): string | null {
  const [body, mac] = String(ticket || '').split('.');
  if (!body || !mac || !same(mac, sign(body))) return 'Ask for a new code.';
  let data: { e: string; x: number; h: string };
  try {
    data = JSON.parse(Buffer.from(body, 'base64url').toString());
  } catch {
    return 'Ask for a new code.';
  }
  if (data.e !== email.toLowerCase()) return 'That code was sent to another email. Ask for a new code.';
  if (Date.now() > data.x) return 'That code has expired. Ask for a new one.';
  if (!/^\d{6}$/.test(code) || !same(data.h, codeHash(email, code))) return 'That code is not right. Check the email and try again.';
  return null;
}

export function sendSignupCode(to: string, name: string, code: string) {
  const first = name.trim().split(' ')[0] || 'there';
  const heading = `Your ${BUSINESS.name} code`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#2b2320">
<h2 style="margin:0 0 12px">${heading}</h2>
<p style="margin:4px 0">Hi ${first.replace(/[<>&"]/g, '')}, enter this code to finish making your account:</p>
<p style="margin:16px 0;font-size:30px;font-weight:bold;letter-spacing:6px">${code}</p>
<p style="margin-top:20px;color:#7a6f6a;font-size:13px">It works for ${CODE_MINUTES} minutes. If you didn't ask for it, you can ignore this email.</p>
</div>`;
  const text = `${heading}\n\nHi ${first}, enter this code to finish making your account: ${code}\n\nIt works for ${CODE_MINUTES} minutes. If you didn't ask for it, you can ignore this email.`;
  return sendMail({ to, subject: `${code} is your ${BUSINESS.name} code`, text, html });
}
