import 'server-only';
import { DEFAULT_BRANCH_ID, DEFAULT_TENANT_ID } from '@/lib/api/config';
import { sameName, servicePrice, serviceDuration, shopClock, SHOP_TIME_ZONE, toList } from '@/lib/format';
import { formatPhone, isValidPhone, phoneDigits, PHONE_ERROR } from '@/lib/phone';
import { freeStartTimes, isTimeFree } from '@/lib/slots';
import { agentRequest, AgentError } from './shopAgent';
import { ensureAccountCustomer, type AccountUser } from './customerAccount';

export { SHOP_TIME_ZONE };

// Per-device booking limit (max 5 bookings/hour). Off while testing; set
// BOOKING_STRICT_CHECKS=true on Vercel at launch. Phone numbers are always validated.
export const STRICT_BOOKING_CHECKS = process.env.BOOKING_STRICT_CHECKS === 'true';
const BOOKING_HORIZON_DAYS = 60;

export interface BookableService {
  serviceId: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  category: string;
  categoryOrder: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}(:\d{2})?$/;

/** Today's date and minutes-since-midnight in the shop's time zone. */
function shopNow(): { date: string; minutes: number } {
  return shopClock();
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export async function listBookableServices(): Promise<BookableService[]> {
  const res = await agentRequest('GET', `/api/v1/services/branches/${DEFAULT_BRANCH_ID}`);
  return toList<any>(res, 'services')
    .filter((s) => s && s.status === 'ACTIVE' && s.isOnlineBookable !== false)
    .map((s) => ({
      serviceId: String(s.serviceId || s.id),
      name: String(s.name || '').trim(),
      description: String(s.description || '').trim(),
      price: servicePrice(s),
      durationMinutes: serviceDuration(s),
      category: s.category?.name || 'Services',
      categoryOrder: Number(s.category?.displayOrder ?? 999),
    }))
    .filter((s) => s.name)
    .sort((a, b) => a.categoryOrder - b.categoryOrder || a.price - b.price);
}

export interface Barber {
  staffId: string;
  name: string;
}

/** Barbers customers can choose: active staff whose job title says "Barber". */
export async function listBarbers(): Promise<Barber[]> {
  const res = await agentRequest('GET', `/api/v1/staff?tenantId=${DEFAULT_TENANT_ID}&limit=100`);
  return toList<any>(res, 'staff')
    .filter((s) => s?.staffId && s.status === 'ACTIVE' && /barber/i.test(String(s.roleTitle || '')))
    .map((s) => ({ staffId: String(s.staffId), name: String(s.fullName || '').trim() }))
    .filter((b) => b.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function findBarber(staffId: string): Promise<Barber> {
  const barber = UUID.test(staffId) && (await listBarbers()).find((b) => b.staffId === staffId);
  if (!barber) throw new AgentError('That barber is not taking online bookings. Please choose another.', 400);
  return barber;
}

/** The shop's current calendar date (YYYY-MM-DD). */
export function shopToday(): string {
  return shopNow().date;
}

/** Validates a date the customer may book on; returns an error message or null. */
export function checkBookableDate(date: string): string | null {
  if (!ISO_DATE.test(date)) return 'Choose a valid date.';
  const today = shopNow().date;
  if (date < today) return 'That date has already passed.';
  if (date > addDays(today, BOOKING_HORIZON_DAYS)) return `Bookings open up to ${BOOKING_HORIZON_DAYS} days ahead.`;
  return null;
}

/** Every booking on a date (any service, any status), or only one barber's. The backend's dateTo is exclusive. */
async function bookingsOn(date: string, staffId?: string) {
  const res = await agentRequest(
    'GET',
    `/api/v1/bookings?branchId=${DEFAULT_BRANCH_ID}&dateFrom=${addDays(date, -1)}&dateTo=${addDays(date, 1)}&limit=500` +
      (staffId ? `&staffId=${staffId}` : '')
  );
  return toList<any>(res, 'bookings');
}

export async function findService(serviceId: string): Promise<BookableService> {
  if (!UUID.test(serviceId)) throw new AgentError('Unknown service', 400);
  const service = (await listBookableServices()).find((s) => s.serviceId === serviceId);
  if (!service) throw new AgentError('That service is not available for online booking.', 400);
  return service;
}

/**
 * Free start times ("HH:MM:SS") for a service on a date. A time is taken by a booking of any
 * service. With a barber (`staffId`), the time must also be free in that barber's own bookings.
 * `excludeBookingId` leaves out a booking that is being moved.
 */
export async function freeTimes(serviceId: string, date: string, excludeBookingId?: string, staffId?: string): Promise<string[]> {
  const dateError = checkBookableDate(date);
  if (dateError) throw new AgentError(dateError, 400);
  const [service, bookings, barberBookings] = await Promise.all([
    findService(serviceId),
    bookingsOn(date),
    staffId ? findBarber(staffId).then(() => bookingsOn(date, staffId)) : Promise.resolve(null),
  ]);
  const now = shopNow();
  const base = {
    date,
    durationMinutes: service.durationMinutes,
    excludeBookingId,
    // Today: only times still ahead of the clock, with a little notice.
    notBeforeMinutes: date === now.date ? now.minutes + 15 : undefined,
  };
  const times = freeStartTimes({ ...base, bookings });
  if (!barberBookings) return times;
  const barberFree = new Set(freeStartTimes({ ...base, bookings: barberBookings, capacity: 1 }));
  return times.filter((t) => barberFree.has(t));
}

export interface GuestBookingInput {
  serviceId: string;
  date: string;
  startTime: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  /** The chosen barber; none means any barber. */
  staffId?: string;
}

export function validateGuestBooking(input: any): { value?: GuestBookingInput; error?: string } {
  const value: GuestBookingInput = {
    serviceId: String(input?.serviceId || ''),
    date: String(input?.date || ''),
    startTime: String(input?.startTime || ''),
    name: String(input?.name || '').trim().replace(/\s+/g, ' '),
    phone: String(input?.phone || '').trim(),
    email: input?.email ? String(input.email).trim() : undefined,
    notes: input?.notes ? String(input.notes).trim().slice(0, 300) : undefined,
    staffId: input?.staffId ? String(input.staffId) : undefined,
  };
  if (value.staffId && !UUID.test(value.staffId)) return { error: 'Choose a barber.' };
  if (!UUID.test(value.serviceId)) return { error: 'Choose a service.' };
  const dateError = checkBookableDate(value.date);
  if (dateError) return { error: dateError };
  if (!TIME.test(value.startTime)) return { error: 'Choose a time.' };
  value.startTime = value.startTime.slice(0, 5) + ':00';
  if (value.name.length < 2 || value.name.length > 80) return { error: 'Enter your name.' };
  if (!isValidPhone(value.phone)) return { error: PHONE_ERROR };
  value.phone = formatPhone(value.phone);
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return { error: 'Check your email address.' };
  return { value };
}

function customerPhone(c: any): string {
  const contacts: any[] = c?.customer?.contacts || c?.contacts || [];
  return contacts.find((ct) => ct.type === 'PHONE')?.value || '';
}

export async function createCustomer(input: { name: string; phone?: string; email?: string; userId?: string }) {
  const created = await agentRequest('POST', '/api/v1/customers', {
    fullName: input.name,
    ...(input.userId ? { userId: input.userId } : {}),
    contacts: [
      ...(input.phone ? [{ type: 'PHONE', value: input.phone, isPrimary: true }] : []),
      ...(input.email ? [{ type: 'EMAIL', value: input.email, isPrimary: !input.phone }] : []),
    ],
  });
  const customerId = created?.customerId || created?.id || created?.customer?.customerId;
  if (!customerId) throw new AgentError('Could not save your details. Please call us to book.', 502);
  await agentRequest('POST', `/api/v1/tenants/${DEFAULT_TENANT_ID}/customers`, {
    customerId,
    preferredBranchId: DEFAULT_BRANCH_ID,
  }).catch(() => {
    /* already linked */
  });
  return String(customerId);
}

/**
 * Reuses the shop's existing customer with this phone number and name, or creates one.
 * The name must match too: a family often shares one phone, and the booking must show the
 * name that was typed.
 */
async function findOrCreateGuest(input: GuestBookingInput): Promise<string> {
  // Search is a text match on the stored number, so use the last 4 digits (contiguous in
  // any common format) and then require the full number to match.
  const digits = phoneDigits(input.phone);
  try {
    const found = await agentRequest(
      'GET',
      `/api/v1/tenants/${DEFAULT_TENANT_ID}/customers?search=${encodeURIComponent(digits.slice(-4))}`
    );
    const match = toList<any>(found, 'customers').find(
      (c) => phoneDigits(customerPhone(c)) === digits && sameName(c?.customer?.fullName ?? c?.fullName, input.name)
    );
    const id = match?.customerId || match?.customer?.customerId;
    if (id) return String(id);
  } catch {
    /* fall through to create */
  }
  return createCustomer({ name: input.name, phone: input.phone, email: input.email });
}

/**
 * Books a time for a guest, or for a signed-in customer (`account`). Bookings made while
 * signed in are linked to the account's customer record so they show up under "My account".
 */
export async function placeOnlineBooking(input: GuestBookingInput, account?: AccountUser | null) {
  const service = await findService(input.serviceId);

  // Re-check the slot right before booking; someone else may have taken it.
  const times = await freeTimes(input.serviceId, input.date, undefined, input.staffId);
  const barber = input.staffId ? await findBarber(input.staffId) : null;
  if (!times.includes(input.startTime)) {
    throw new AgentError('Sorry, that time is not available any more. Please pick another time.', 409);
  }

  let customerId: string;
  if (account) {
    customerId = await ensureAccountCustomer(account, { name: input.name, phone: input.phone });
  } else {
    customerId = await findOrCreateGuest(input);
  }

  const booking = await agentRequest('POST', '/api/v1/bookings', {
    tenantId: DEFAULT_TENANT_ID,
    branchId: DEFAULT_BRANCH_ID,
    customerId,
    serviceId: input.serviceId,
    ...(barber ? { staffId: barber.staffId } : {}),
    date: input.date,
    startTime: input.startTime,
    notes: ['Booked online', barber ? `Barber: ${barber.name}` : '', input.notes].filter(Boolean).join(' — '),
  });

  // Two people may have pressed "Book" for the same time at the same moment. If this booking
  // overbooked the shop, the later one gives the time back.
  try {
    const sameDay = await bookingsOn(input.date);
    const mineId = String(booking?.bookingId || booking?.id || '');
    const mine = sameDay.find((b) => String(b.bookingId) === mineId);
    // Booking numbers are sequential (SAL-2026-000012), so they tell which booking came first.
    const earlier = sameDay.filter(
      (b) => String(b.bookingId) !== mineId && String(b.bookingNumber || '') < String(mine?.bookingNumber || '')
    );
    if (mine && !isTimeFree({ date: input.date, startTime: input.startTime, durationMinutes: service.durationMinutes, bookings: earlier })) {
      await agentRequest('POST', `/api/v1/bookings/${mineId}/cancel`, { reason: 'Time was taken by another booking' });
      throw new AgentError('Sorry, that time was just taken. Please pick another time.', 409);
    }
  } catch (err) {
    if (err instanceof AgentError && err.status === 409) throw err;
    /* the check is best-effort */
  }

  return {
    bookingNumber: booking?.bookingNumber || null,
    service: service.name,
    barber: barber?.name || null,
    price: service.price,
    date: input.date,
    startTime: input.startTime,
  };
}
