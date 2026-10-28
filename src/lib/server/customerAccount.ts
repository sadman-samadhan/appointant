import 'server-only';
import type { NextRequest } from 'next/server';
import { DEFAULT_TENANT_ID } from '@/lib/api/config';
import { toList } from '@/lib/format';
import { formatPhone, phoneDigits } from '@/lib/phone';
import { agentRequest } from './shopAgent';
import { createCustomer } from './onlineBooking';

// Signed-in customers can't read the shop's records directly (the Core Backend only lets
// shop members in), so their own data is read here: the Auth Service confirms who they
// are, then the shop account looks up the customer record(s) that belong to them.
const AUTH_BACKEND = process.env.AUTH_BACKEND_URL || 'http://3.6.123.11:3302';

export interface AccountUser {
  id: string;
  email: string;
  name: string;
}

/** The signed-in user behind the request's Bearer token, or null. */
export async function accountFromRequest(req: NextRequest): Promise<AccountUser | null> {
  const auth = req.headers.get('authorization');
  if (!auth || !/^Bearer\s+\S+/i.test(auth)) return null;
  try {
    const res = await fetch(`${AUTH_BACKEND}/users/me`, {
      headers: { Authorization: auth },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const me = await res.json();
    const email = String(me?.email || (String(me?.userid || '').includes('@') ? me.userid : '')).trim().toLowerCase();
    if (me?.id == null || !email) return null;
    return { id: String(me.id), email, name: String(me.name || email.split('@')[0]) };
  } catch {
    return null;
  }
}

function contactsOf(c: any): any[] {
  return c?.contacts || [];
}

function contactValue(c: any, type: 'EMAIL' | 'PHONE'): string {
  const list = contactsOf(c).filter((ct) => ct.type === type);
  return (list.find((ct) => ct.isPrimary) || list[0])?.value || '';
}

/** Customer records that belong to this account: linked by user id, or carrying its email. */
async function accountCustomers(account: AccountUser): Promise<any[]> {
  const res = await agentRequest(
    'GET',
    `/api/v1/tenants/${DEFAULT_TENANT_ID}/customers?search=${encodeURIComponent(account.email)}&limit=50`
  );
  return toList<any>(res, 'customers')
    .map((row) => row?.customer || row)
    .filter(
      (c) =>
        c?.customerId &&
        (String(c.userId ?? '') === account.id ||
          contactsOf(c).some((ct) => ct.type === 'EMAIL' && String(ct.value).trim().toLowerCase() === account.email))
    )
    // The record linked to the account first, then the most recently updated.
    .sort(
      (a, b) =>
        Number(String(b.userId ?? '') === account.id) - Number(String(a.userId ?? '') === account.id) ||
        String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
    );
}

/** The account's customer id, creating the customer record on first use. */
export async function ensureAccountCustomer(account: AccountUser, details: { name?: string; phone?: string } = {}) {
  const [primary] = await accountCustomers(account);
  if (primary) return String(primary.customerId);
  return createCustomer({
    name: details.name || account.name,
    phone: details.phone,
    email: account.email,
    userId: account.id,
  });
}

export async function getAccountDetails(account: AccountUser) {
  const [primary] = await accountCustomers(account);
  return {
    email: account.email,
    name: primary?.fullName || account.name,
    phone: primary ? formatPhone(contactValue(primary, 'PHONE')) : '',
  };
}

/** Updates the name and phone on every customer record of the account. */
export async function updateAccountDetails(account: AccountUser, details: { name: string; phone: string }) {
  const customers = await accountCustomers(account);
  if (customers.length === 0) {
    await ensureAccountCustomer(account, details);
    return;
  }
  for (const c of customers) {
    const id = String(c.customerId);
    if (c.fullName !== details.name) {
      await agentRequest('PATCH', `/api/v1/customers/${id}`, { fullName: details.name });
    }
    const phones = contactsOf(c).filter((ct) => ct.type === 'PHONE');
    if (phones.some((ct) => phoneDigits(ct.value) === phoneDigits(details.phone))) continue;
    await agentRequest('POST', `/api/v1/customers/${id}/contacts`, { type: 'PHONE', value: details.phone, isPrimary: true });
    for (const old of phones) {
      const contactId = old.contactId || old.id;
      if (contactId) await agentRequest('DELETE', `/api/v1/customers/${id}/contacts/${contactId}`).catch(() => {});
    }
  }
}

/** All bookings of the account's customer records, newest first. */
export async function listAccountBookings(account: AccountUser) {
  const customers = await accountCustomers(account);
  const lists = await Promise.all(
    customers.map((c) =>
      agentRequest('GET', `/api/v1/bookings?customerId=${c.customerId}&limit=200`).then((r) => toList<any>(r, 'bookings'))
    )
  );
  const seen = new Set<string>();
  return lists
    .flat()
    .filter((b) => b?.bookingId && !seen.has(b.bookingId) && seen.add(b.bookingId))
    .map((b) => ({
      bookingId: String(b.bookingId),
      bookingNumber: b.bookingNumber || null,
      status: String(b.status || ''),
      startTime: b.startTime,
      endTime: b.endTime,
      totalPrice: b.totalPrice,
      currency: b.currency || 'CAD',
      serviceName: b.serviceDetails?.name || 'Service',
    }))
    .sort((a, b) => String(b.startTime).localeCompare(String(a.startTime)));
}
