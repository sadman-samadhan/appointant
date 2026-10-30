import 'server-only';
import type { NextRequest } from 'next/server';
import { DEFAULT_BRANCH_ID, DEFAULT_TENANT_ID } from '@/lib/api/config';
import { shopClock, toList, wallClockDate, wallClockTime } from '@/lib/format';
import { formatPhone, phoneDigits } from '@/lib/phone';
import { AgentError, agentRequest } from './shopAgent';
import { checkBookableDate, createCustomer, findService, freeTimes } from './onlineBooking';

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

/** A customer's full contact list. Search results only carry the contacts that matched the search. */
async function fullContacts(customerId: string): Promise<any[]> {
  const res = await agentRequest('GET', `/api/v1/customers/${customerId}/contacts`);
  return toList<any>(res, 'contacts');
}

function primaryPhone(contacts: any[]): string {
  return contactValue({ contacts }, 'PHONE');
}

export async function getAccountDetails(account: AccountUser) {
  const [primary] = await accountCustomers(account);
  const phone = primary ? primaryPhone(await fullContacts(String(primary.customerId))) : '';
  return {
    email: account.email,
    name: primary?.fullName || account.name,
    phone: phone ? formatPhone(phone) : '',
  };
}

/**
 * Updates the name, and the phone when one is given, on every customer record of the account.
 * The new number becomes the only phone on the record.
 */
export async function updateAccountDetails(account: AccountUser, details: { name: string; phone?: string }) {
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
    if (!details.phone) continue;
    const phones = (await fullContacts(id)).filter((ct) => ct.type === 'PHONE');
    const wanted = phoneDigits(details.phone);
    let keep = phones.find((ct) => phoneDigits(ct.value) === wanted);
    if (!keep) {
      keep = await agentRequest('POST', `/api/v1/customers/${id}/contacts`, { type: 'PHONE', value: details.phone, isPrimary: true });
    } else if (!keep.isPrimary) {
      await agentRequest('PATCH', `/api/v1/customers/${id}/contacts/${keep.contactId}/set-primary`);
    }
    for (const old of phones) {
      if (old.contactId === keep?.contactId) continue;
      await agentRequest('DELETE', `/api/v1/customers/${id}/contacts/${old.contactId}`).catch(() => {});
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
      serviceId: b.serviceDetails?.id ? String(b.serviceDetails.id) : '',
      serviceName: b.serviceDetails?.name || 'Service',
      canChange: canChange(b),
    }))
    .sort((a, b) => String(b.startTime).localeCompare(String(a.startTime)));
}

// ---- Customers moving or cancelling their own booking ----

/** Customers can move or cancel a booking up to this many hours before it starts. */
export const CHANGE_CUTOFF_HOURS = 24;
const CHANGEABLE = ['DRAFT', 'LOCKED', 'CONFIRMED'];

/** Hours from now (shop time) until a booking's wall-clock start time. */
function hoursUntil(startTime: string): number {
  const start = Date.parse(String(startTime));
  const now = shopClock();
  const nowWall = Date.parse(`${now.date}T00:00:00Z`) + now.minutes * 60_000;
  return (start - nowWall) / 3_600_000;
}

function canChange(b: any): boolean {
  return CHANGEABLE.includes(String(b?.status)) && !!b?.startTime && hoursUntil(b.startTime) >= CHANGE_CUTOFF_HOURS;
}

const TOO_LATE = `Your appointment is less than ${CHANGE_CUTOFF_HOURS} hours away. Please call us to change it.`;

/** One of the account's own bookings, checked that it may still be changed. */
async function changeableBooking(account: AccountUser, bookingId: string) {
  const booking = (await listAccountBookings(account)).find((b) => b.bookingId === bookingId);
  if (!booking) throw new AgentError('Booking not found.', 404);
  if (!CHANGEABLE.includes(booking.status)) throw new AgentError('This booking can no longer be changed.', 400);
  if (!booking.canChange) throw new AgentError(TOO_LATE, 400);
  return booking;
}

export async function cancelAccountBooking(account: AccountUser, bookingId: string) {
  await changeableBooking(account, bookingId);
  await agentRequest('POST', `/api/v1/bookings/${bookingId}/cancel`, { reason: 'Cancelled by the customer online' });
}

/**
 * Moves the account's booking to a new date and time. The backend only moves confirmed
 * bookings; one still waiting for the shop to confirm is booked again at the new time (still
 * to confirm) and the old one cancelled. Returns the booking's id, which may be new.
 */
export async function rescheduleAccountBooking(account: AccountUser, bookingId: string, date: string, startTime: string) {
  const booking = await changeableBooking(account, bookingId);
  const dateError = checkBookableDate(date);
  if (dateError) throw new AgentError(dateError, 400);
  const time = `${startTime.slice(0, 5)}:00`;
  if (!/^\d{2}:\d{2}:00$/.test(time)) throw new AgentError('Choose a time.', 400);
  const service = await findService(booking.serviceId);
  const detail = await agentRequest('GET', `/api/v1/bookings/${bookingId}`);
  // The booking keeps its barber, if it has one.
  const staffId: string | undefined = detail?.staff?.id ? String(detail.staff.id) : undefined;
  const free = await freeTimes(service.serviceId, date, bookingId, staffId).catch((err) =>
    // A barber who no longer takes online bookings: check the shop's times only.
    staffId && err instanceof AgentError && err.status === 400 ? freeTimes(service.serviceId, date, bookingId) : Promise.reject(err)
  );
  if (!free.includes(time)) {
    throw new AgentError('Sorry, that time is not available any more. Please pick another time.', 409);
  }
  if (date === wallClockDate(booking.startTime) && time === `${wallClockTime24(booking.startTime)}:00`) return bookingId;

  if (booking.status === 'CONFIRMED' || booking.status === 'LOCKED') {
    await agentRequest('POST', `/api/v1/bookings/${bookingId}/reschedule`, { date, startTime: time });
    return bookingId;
  }
  const from = `${wallClockDate(booking.startTime)} ${wallClockTime(booking.startTime)}`;
  const created = await agentRequest('POST', '/api/v1/bookings', {
    tenantId: DEFAULT_TENANT_ID,
    branchId: DEFAULT_BRANCH_ID,
    customerId: detail?.customer?.id,
    serviceId: service.serviceId,
    ...(staffId ? { staffId } : {}),
    date,
    startTime: time,
    notes: [detail?.notes, `Moved by the customer from ${from}`].filter(Boolean).join(' — '),
  });
  await agentRequest('POST', `/api/v1/bookings/${bookingId}/cancel`, { reason: `Moved by the customer to ${date} ${time.slice(0, 5)}` });
  return String(created?.bookingId || bookingId);
}

/** "HH:MM" of a wall-clock timestamp. */
function wallClockTime24(value: string): string {
  return String(value).slice(11, 16);
}
