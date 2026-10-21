import 'server-only';
import { DEFAULT_BRANCH_ID, DEFAULT_TENANT_ID } from '@/lib/api/config';
import { servicePrice, serviceDuration, toList } from '@/lib/format';
import { agentRequest, AgentError } from './shopAgent';

export const SHOP_TIME_ZONE = 'America/Moncton';
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
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
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

/** Free start times ("HH:MM:SS") for a service on a date, as offered by the shop's availability engine. */
export async function freeTimes(serviceId: string, date: string): Promise<string[]> {
  if (!UUID.test(serviceId)) throw new AgentError('Unknown service', 400);
  const dateError = checkBookableDate(date);
  if (dateError) throw new AgentError(dateError, 400);

  const res = await agentRequest(
    'GET',
    `/api/v1/availability/unified?branchId=${DEFAULT_BRANCH_ID}&serviceId=${serviceId}&startDate=${date}&endDate=${date}`
  );
  const now = shopNow();
  const times = new Set<string>();
  for (const slot of toList<any>(res, 'slots')) {
    if (!slot || slot.date !== date || !TIME.test(String(slot.startTime))) continue;
    if (Number(slot.remainingCapacity ?? 1) <= 0) continue;
    const start = String(slot.startTime).slice(0, 5) + ':00';
    // Today: only times still ahead of the clock (with a little notice).
    if (date === now.date && toMinutes(start) <= now.minutes + 15) continue;
    times.add(start);
  }
  return [...times].sort();
}

export interface GuestBookingInput {
  serviceId: string;
  date: string;
  startTime: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');

export function validateGuestBooking(input: any): { value?: GuestBookingInput; error?: string } {
  const value: GuestBookingInput = {
    serviceId: String(input?.serviceId || ''),
    date: String(input?.date || ''),
    startTime: String(input?.startTime || ''),
    name: String(input?.name || '').trim().replace(/\s+/g, ' '),
    phone: String(input?.phone || '').trim(),
    email: input?.email ? String(input.email).trim() : undefined,
    notes: input?.notes ? String(input.notes).trim().slice(0, 300) : undefined,
  };
  if (!UUID.test(value.serviceId)) return { error: 'Choose a service.' };
  const dateError = checkBookableDate(value.date);
  if (dateError) return { error: dateError };
  if (!TIME.test(value.startTime)) return { error: 'Choose a time.' };
  value.startTime = value.startTime.slice(0, 5) + ':00';
  if (value.name.length < 2 || value.name.length > 80) return { error: 'Enter your name.' };
  const phoneDigits = digits(value.phone);
  if (phoneDigits.length < 10 || phoneDigits.length > 15) return { error: 'Enter a phone number we can reach you on.' };
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return { error: 'Check your email address.' };
  return { value };
}

function customerPhone(c: any): string {
  const contacts: any[] = c?.customer?.contacts || c?.contacts || [];
  return contacts.find((ct) => ct.type === 'PHONE')?.value || '';
}

/** Reuses the shop's existing customer with this phone number, or creates one. */
async function findOrCreateCustomer(input: GuestBookingInput): Promise<string> {
  // Search is a text match on the stored number, so use the last 4 digits (contiguous in
  // any common format) and then require the full number to match.
  const phoneDigits = digits(input.phone);
  try {
    const found = await agentRequest(
      'GET',
      `/api/v1/tenants/${DEFAULT_TENANT_ID}/customers?search=${encodeURIComponent(phoneDigits.slice(-4))}`
    );
    const match = toList<any>(found, 'customers').find((c) => digits(customerPhone(c)).endsWith(phoneDigits.slice(-10)));
    const id = match?.customerId || match?.customer?.customerId;
    if (id) return String(id);
  } catch {
    /* fall through to create */
  }

  const created = await agentRequest('POST', '/api/v1/customers', {
    fullName: input.name,
    contacts: [
      { type: 'PHONE', value: input.phone, isPrimary: true },
      ...(input.email ? [{ type: 'EMAIL', value: input.email, isPrimary: false }] : []),
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

export async function placeGuestBooking(input: GuestBookingInput) {
  const services = await listBookableServices();
  const service = services.find((s) => s.serviceId === input.serviceId);
  if (!service) throw new AgentError('That service is not available for online booking.', 400);

  // Re-check the slot right before booking; someone else may have taken it.
  const times = await freeTimes(input.serviceId, input.date);
  if (!times.includes(input.startTime)) {
    throw new AgentError('Sorry, that time is not available any more. Please pick another time.', 409);
  }

  const customerId = await findOrCreateCustomer(input);
  const booking = await agentRequest('POST', '/api/v1/bookings', {
    tenantId: DEFAULT_TENANT_ID,
    branchId: DEFAULT_BRANCH_ID,
    customerId,
    serviceId: input.serviceId,
    date: input.date,
    startTime: input.startTime,
    notes: ['Booked online', input.notes].filter(Boolean).join(' — '),
  });

  return {
    bookingNumber: booking?.bookingNumber || null,
    service: service.name,
    price: service.price,
    date: input.date,
    startTime: input.startTime,
  };
}
