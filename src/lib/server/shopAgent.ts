import 'server-only';
import { DEFAULT_BRANCH_ID, DEFAULT_TENANT_ID } from '@/lib/api/config';

// Server-side account that acts for the shop on public pages (online booking).
// The Auth Service can't yet give customers access to a shop, so guest bookings are
// placed by this account instead. Credentials are server-only env vars and must
// belong to an account that can manage this shop (today: the owner).
//   BOOKING_AGENT_USERID / BOOKING_AGENT_PASSWORD (falls back to CATALOG_*).
const AUTH_BACKEND = process.env.AUTH_BACKEND_URL || 'http://3.6.123.11:3302';
const CORE_BACKEND = process.env.CORE_BACKEND_URL || 'http://3.6.123.11:3301';

let cached: { token: string; expiresAt: number } | null = null;

export class AgentError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function agentConfigured(): boolean {
  return !!(
    (process.env.BOOKING_AGENT_USERID || process.env.CATALOG_USERID) &&
    (process.env.BOOKING_AGENT_PASSWORD || process.env.CATALOG_PASSWORD)
  );
}

async function token(forceNew = false): Promise<string> {
  const userid = process.env.BOOKING_AGENT_USERID || process.env.CATALOG_USERID;
  const password = process.env.BOOKING_AGENT_PASSWORD || process.env.CATALOG_PASSWORD;
  if (!userid || !password) throw new AgentError('Online booking is not configured', 503);
  if (!forceNew && cached && cached.expiresAt > Date.now()) return cached.token;

  const res = await fetch(`${AUTH_BACKEND}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userid, password }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new AgentError('Online booking is temporarily unavailable', 503);
  const data = await res.json();
  const ttlMs = Math.max(60, Number(data.expires_in) || 900) * 1000 - 60_000;
  cached = { token: data.access_token, expiresAt: Date.now() + ttlMs };
  return cached.token;
}

/** Calls the Core Backend as the shop. Throws AgentError with the backend's message. */
export async function agentRequest<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const send = async (t: string) =>
    fetch(`${CORE_BACKEND}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${t}`,
        'Content-Type': 'application/json',
        'x-tenant-id': DEFAULT_TENANT_ID,
        'x-branch-id': DEFAULT_BRANCH_ID,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });

  let res = await send(await token());
  if (res.status === 401) res = await send(await token(true));

  const text = await res.text();
  let data: any = text;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* plain text */
  }
  if (!res.ok) {
    const msg = data?.message;
    throw new AgentError(Array.isArray(msg) ? msg.join('; ') : String(msg || `Request failed (${res.status})`), res.status);
  }
  return data as T;
}
