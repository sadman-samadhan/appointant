// Appointment actions for the shop owner's screens. Each function is one thing the barber
// does ("confirm", "finish & take payment", "walk-in sale"); the backend steps behind it
// (tax, invoice, payment, status changes) happen here so the screens stay simple.
import { generateIdempotencyKey } from '@/lib/api/client';
import { apiRequest } from '@/lib/api/request';
import { DEFAULT_BRANCH_ID, DEFAULT_TENANT_ID } from '@/lib/api/config';
import { BUSINESS } from '@/lib/business';
import { sameName, servicePrice, serviceDuration, shopClock, toList, toNumber, todayISO, wallClockDate } from '@/lib/format';
import { addAutoIncome, billTag, listEntries, TAKEN_BY_PREFIX, WALK_IN_CATEGORY } from '@/lib/moneyBook';
import { formatPhone, phoneDigits } from '@/lib/phone';
import type { BarberHours } from '@/lib/slots';

export interface ShopBooking {
  bookingId: string;
  bookingNumber: string | null;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  serviceId?: string;
  serviceName: string;
  /** The barber the booking is with; none means any barber. */
  staffId?: string;
  staffName?: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: string;
  total: number;
  /** A walk-in sale (kept in Accounting, not a backend booking). */
  walkIn?: boolean;
}

export interface ShopService {
  serviceId: string;
  name: string;
  price: number;
  durationMinutes: number;
}

export const ACTIVE_STATUSES = ['DRAFT', 'LOCKED', 'SCHEDULED', 'CONFIRMED', 'CHECKED_IN'];

export const money = (n: number) => Math.round(n * 100) / 100;
export const taxOn = (price: number) => money(price * BUSINESS.taxRate);

function normalizeBooking(b: any): ShopBooking {
  return {
    bookingId: String(b.bookingId || b.id),
    bookingNumber: b.bookingNumber || null,
    customerId: b.customer?.id || b.customerId,
    customerName: b.customer?.name || b.customerName || 'Customer',
    customerPhone: b.customer?.phone ? formatPhone(b.customer.phone) : '',
    serviceId: b.serviceDetails?.id || b.serviceId,
    serviceName: b.serviceDetails?.name || b.serviceName || 'Service',
    date: wallClockDate(b.startTime || b.date),
    startTime: b.startTime,
    endTime: b.endTime,
    status: String(b.status || 'DRAFT'),
    total: toNumber(b.totalPrice ?? b.totalAmount ?? b.serviceDetails?.basePrice),
  };
}

export type Barber = BarberHours;

/** The shop's barbers (active staff whose job title says "Barber") with their weekly schedules. */
export async function loadBarbers(): Promise<Barber[]> {
  const [res, schedules] = await Promise.all([
    apiRequest<any>(`/api/v1/staff?tenantId=${DEFAULT_TENANT_ID}&limit=100`),
    apiRequest<any>('/api/v1/availability/weekly-schedules?entityType=STAFF').catch(() => null),
  ]);
  const rows = toList<any>(schedules, 'schedules');
  return toList<any>(res, 'staff')
    .filter((s) => s?.staffId && s.status === 'ACTIVE' && /barber/i.test(String(s.roleTitle || '')))
    .map((s) => ({
      staffId: String(s.staffId),
      name: String(s.fullName || '').trim(),
      schedule: rows.filter((r) => String(r.entityId) === String(s.staffId)),
    }))
    .filter((b) => b.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Every booking of the shop (the backend pages 20 at a time by default), each with its barber.
 * The booking list doesn't say who a booking is with, so each barber's bookings are fetched too.
 */
export async function loadBookings(barbers: Barber[] = []): Promise<ShopBooking[]> {
  const [res, ...perBarber] = await Promise.all([
    apiRequest<any>(`/api/v1/bookings?branchId=${DEFAULT_BRANCH_ID}&limit=1000`),
    ...barbers.map((b) =>
      apiRequest<any>(`/api/v1/bookings?branchId=${DEFAULT_BRANCH_ID}&staffId=${b.staffId}&limit=1000`).catch(() => null)
    ),
  ]);
  const barberOf = new Map<string, Barber>();
  perBarber.forEach((list, i) => {
    for (const b of toList<any>(list, 'bookings')) barberOf.set(String(b.bookingId || b.id), barbers[i]);
  });
  return toList<any>(res, 'bookings')
    .filter((b) => b && (b.bookingId || b.id))
    .map(normalizeBooking)
    .map((b) => {
      const barber = barberOf.get(b.bookingId);
      return barber ? { ...b, staffId: barber.staffId, staffName: barber.name } : b;
    });
}

export async function loadServices(): Promise<ShopService[]> {
  const res = await apiRequest<any>(`/api/v1/services/branches/${DEFAULT_BRANCH_ID}`);
  return toList<any>(res, 'services')
    .filter((s) => s && s.status === 'ACTIVE')
    .map((s) => ({
      serviceId: String(s.serviceId || s.id),
      name: String(s.name || 'Service').trim(),
      price: servicePrice(s),
      durationMinutes: serviceDuration(s),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function contactPhone(c: any): string {
  const contacts: any[] = c?.customer?.contacts || c?.contacts || [];
  return contacts.find((ct) => ct.type === 'PHONE')?.value || '';
}

/**
 * Reuses the shop's customer with this phone number and name, or creates a new customer.
 * The name must match too: a family often shares one phone, and the booking must show the
 * name that was typed.
 */
export async function findOrCreateCustomer(name: string, phone?: string): Promise<string> {
  const digits = phoneDigits(phone);
  if (digits.length === 10) {
    try {
      const found = await apiRequest<any>(
        `/api/v1/tenants/${DEFAULT_TENANT_ID}/customers?search=${encodeURIComponent(digits.slice(-4))}&limit=50`
      );
      const match = toList<any>(found, 'customers').find(
        (c) => phoneDigits(contactPhone(c)) === digits && sameName(c?.customer?.fullName ?? c?.fullName, name)
      );
      const id = match?.customerId || match?.customer?.customerId;
      if (id) return String(id);
    } catch {
      /* create below */
    }
  }
  const created = await apiRequest<any>('/api/v1/customers', {
    method: 'POST',
    body: JSON.stringify({
      fullName: name,
      contacts: digits.length === 10 ? [{ type: 'PHONE', value: formatPhone(digits), isPrimary: true }] : [],
    }),
  });
  const customerId = created?.customerId || created?.id || created?.customer?.customerId;
  if (!customerId) throw new Error('The customer could not be saved. Please try again.');
  await apiRequest(`/api/v1/tenants/${DEFAULT_TENANT_ID}/customers`, {
    method: 'POST',
    body: JSON.stringify({ customerId, preferredBranchId: DEFAULT_BRANCH_ID }),
  }).catch(() => {
    /* already linked to the shop */
  });
  return String(customerId);
}

export async function createBooking(input: {
  customerId: string;
  serviceId: string;
  staffId?: string;
  date: string;
  startTime: string;
  notes?: string;
}): Promise<string> {
  const res = await apiRequest<any>('/api/v1/bookings', {
    method: 'POST',
    body: JSON.stringify({
      tenantId: DEFAULT_TENANT_ID,
      branchId: DEFAULT_BRANCH_ID,
      customerId: input.customerId,
      serviceId: input.serviceId,
      staffId: input.staffId || undefined,
      date: input.date,
      startTime: input.startTime.length === 5 ? `${input.startTime}:00` : input.startTime,
      notes: input.notes || undefined,
    }),
  });
  const id = res?.bookingId || res?.id;
  if (!id) throw new Error('The appointment was not saved. Please try again.');
  return String(id);
}

/**
 * Confirms a booking with sales tax added automatically. `servicePrice` is the price before
 * tax; the backend replaces the tax it put on the booking when it was made with this one.
 */
export async function confirmBooking(booking: { bookingId: string; servicePrice: number }, extra?: { tip?: number; discount?: number }) {
  await apiRequest(`/api/v1/bookings/${booking.bookingId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({
      vatAmount: taxOn(booking.servicePrice),
      tipAmount: money(extra?.tip || 0),
      discountAmount: money(extra?.discount || 0),
      // No note: the backend's confirm replaces the booking's notes with it.
    }),
  });
}

export async function markArrived(bookingId: string) {
  await apiRequest(`/api/v1/bookings/${bookingId}/checkin`, { method: 'POST', body: '{}' });
}

export async function markNoShow(bookingId: string) {
  await apiRequest(`/api/v1/bookings/${bookingId}/no-show`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'Customer did not come' }),
  });
}

export async function cancelBooking(bookingId: string, reason: string) {
  await apiRequest(`/api/v1/bookings/${bookingId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || 'Cancelled by the shop' }),
  });
}

/**
 * Moves a booking to a new date and time, and/or another barber (`staffId`: null for any
 * barber, left out to keep the barber). The backend only moves confirmed bookings and can't
 * change the barber, so otherwise the booking is made again (confirmed again if it was, which
 * needs `servicePrice`) and the old one cancelled. Returns the booking's id, which is new then.
 */
export async function rescheduleBooking(
  bookingId: string,
  date: string,
  startTime: string,
  opts: { staffId?: string | null; servicePrice?: number } = {}
): Promise<string> {
  const time = startTime.length === 5 ? `${startTime}:00` : startTime;
  const detail = await apiRequest<any>(`/api/v1/bookings/${bookingId}`);
  const currentStaff: string | null = detail?.staff?.id ? String(detail.staff.id) : null;
  const staffId = opts.staffId === undefined ? currentStaff : opts.staffId;
  const confirmed = ['CONFIRMED', 'LOCKED'].includes(String(detail?.status));
  if (confirmed && staffId === currentStaff) {
    await apiRequest(`/api/v1/bookings/${bookingId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ date, startTime: time }),
    });
    return bookingId;
  }
  const newId = await createBooking({
    customerId: String(detail?.customer?.id || ''),
    serviceId: String(detail?.service?.id || ''),
    staffId: staffId || undefined,
    date,
    startTime: time,
    notes: detail?.notes || undefined,
  });
  if (confirmed && opts.servicePrice !== undefined) await confirmBooking({ bookingId: newId, servicePrice: opts.servicePrice });
  await cancelBooking(bookingId, `Moved to ${date} ${time.slice(0, 5)}`);
  return newId;
}

interface Bill {
  invoiceId: string;
  invoiceNumber: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  /** Discount on the bill, before tax. */
  discount: number;
  customerId?: string;
}

function toBill(inv: any): Bill {
  return {
    invoiceId: inv.invoiceId,
    invoiceNumber: String(inv.invoiceNumber || ''),
    total: toNumber(inv.total),
    amountPaid: toNumber(inv.amountPaid),
    balanceDue: toNumber(inv.balanceDue ?? inv.total),
    discount: toNumber(inv.discountAmount),
    customerId: inv.customerId,
  };
}

/** The open bill for a booking, if one was already made. */
async function findBill(bookingId: string): Promise<Bill | null> {
  const res = await apiRequest<any>('/api/v1/billing/invoices?limit=500');
  const inv = toList<any>(res, 'invoices').find(
    (i) => !['VOID', 'CANCELLED'].includes(i.status) && (i.items || []).some((it: any) => it?.bookingId === bookingId)
  );
  return inv ? toBill(inv) : null;
}

/** The largest discount on a price: the backend can't record a $0 bill. */
export const maxDiscount = (price: number) => Math.max(0, money(price - 0.01));

/**
 * What the customer owes for an arrived appointment (makes the bill if needed).
 *
 * The backend's bill leaves the booking's tax out of its total (it records the tax but
 * doesn't add it), and it won't complete a booking whose bills include a voided one, so the
 * bill can't simply be redone. Instead the gap between the booking total and the bill is
 * returned as `extraTax`: the customer pays both, and the gap is booked as tax income.
 * Once the backend adds tax itself the gap is zero.
 */
export async function billFor(
  booking: ShopBooking,
  opts: { discount?: number; create?: boolean } = { create: true }
): Promise<{ bill: Bill | null; extraTax: number; totalDue: number; price: number; discountable: boolean }> {
  const details = await apiRequest<any>(`/api/v1/bookings/${booking.bookingId}`);
  let bill = await findBill(booking.bookingId);
  const fullTotal = money(toNumber(details?.totalPrice ?? booking.total));
  // The price before HST; a discount comes off it (and so off the HST too).
  const price = money(fullTotal / (1 + BUSINESS.taxRate));
  // A discount goes on the bill when it is made; an existing bill can't be changed.
  const discountable = !bill;
  // The backend can't record a $0 bill, so a "free" service is charged one cent.
  const discount = bill ? bill.discount : Math.min(maxDiscount(price), Math.max(0, money(opts.discount || 0)));
  const expected = money(fullTotal - discount * (1 + BUSINESS.taxRate));
  if (!bill && opts.create) {
    const created = await apiRequest<any>(`/api/v1/bookings/${booking.bookingId}/invoice-draft`, {
      method: 'POST',
      body: JSON.stringify({
        currency: BUSINESS.currency,
        notes: `${booking.serviceName} for ${booking.customerName}`,
        ...(discount > 0 ? { discountAmount: discount } : {}),
      }),
    });
    bill = toBill(created);
  }
  if (!bill) return { bill: null, extraTax: 0, totalDue: expected, price, discountable };
  const extraTax = bill.amountPaid > 0 ? 0 : Math.max(0, money(expected - bill.total));
  return { bill, extraTax, totalDue: money(bill.balanceDue + extraTax), price, discountable };
}

// Accounting shows the HST and tip of a bill together with the bill's payment (see moneyBook).
const billNote = (text: string, bill: Bill) => (bill.invoiceNumber ? `${text} ${billTag(bill.invoiceNumber)}` : text);

/** Written on a payment (and its HST and tip) so Accounting can show who took the money. */
export const takenByNote = (name: string) => `${TAKEN_BY_PREFIX}${name}`;

/**
 * Takes the cash for an arrived appointment and marks it done. The payment is recorded
 * as income automatically; a tip is added to the Accounting book separately. `takenBy` is
 * who took the money (the barber, or "Owner"), kept with the payment for the day's cash-up.
 */
export async function finishAndPay(booking: ShopBooking, opts: { tip?: number; takenBy?: string; discount?: number } = {}) {
  const by = opts.takenBy?.trim() ? ` — ${takenByNote(opts.takenBy.trim())}` : '';
  const { bill: made, extraTax, totalDue } = await billFor(booking, { discount: opts.discount, create: true });
  const bill = made as Bill;
  if (bill.balanceDue > 0) {
    await apiRequest('/api/v1/payments', {
      method: 'POST',
      body: JSON.stringify({
        customerId: bill.customerId || booking.customerId,
        invoiceId: bill.invoiceId,
        amount: bill.balanceDue,
        currency: BUSINESS.currency,
        paymentMethod: 'CASH',
        paymentDate: todayISO(),
        notes: `${booking.serviceName} — ${booking.customerName}${by}`,
        idempotencyKey: generateIdempotencyKey(),
      }),
    });
  }
  if (booking.status !== 'COMPLETED') {
    await apiRequest(`/api/v1/bookings/${booking.bookingId}/complete`, { method: 'POST', body: '{}' });
  }
  const today = todayISO();
  if (extraTax > 0) {
    await addAutoIncome('salesTax', { amount: extraTax, date: today, note: billNote(`${BUSINESS.taxLabel} — ${booking.customerName}${by}`, bill) });
  }
  if (opts.tip && opts.tip > 0) {
    await addAutoIncome('tip', { amount: opts.tip, date: today, note: billNote(`${booking.customerName}${by}`, bill) });
  }
  return totalDue;
}

const WALK_IN_SEPARATOR = ' · ';

/**
 * A walk-in customer who has just been served. The cash goes straight into Accounting as
 * "Walk-ins" income, HST split out (service and name in the note), and it shows in the appointment list.
 *
 * Walk-ins are not made as backend bookings: the backend refuses any booking time earlier
 * than its UTC clock (3-4 hours ahead of the shop), so "now" can't be booked.
 */
export async function recordWalkIn(input: {
  service: ShopService;
  customerName?: string;
  /** The price charged before HST (the service price, or less for a discount). */
  price: number;
  tip?: number;
  /** The day of the visit (default today). */
  date?: string;
  takenBy?: string;
}) {
  const name = input.customerName?.trim() || 'Walk-in customer';
  const by = input.takenBy?.trim() ? ` — ${takenByNote(input.takenBy.trim())}` : '';
  const date = input.date || todayISO();
  const price = money(input.price);
  if (!(price > 0)) throw new Error('Enter the price.');
  await addAutoIncome('walkIn', {
    amount: money(price + taxOn(price)),
    tax: taxOn(price),
    date,
    note: `${input.service.name}${WALK_IN_SEPARATOR}${name}${by}`,
  });
  if (input.tip && input.tip > 0) {
    await addAutoIncome('tip', { amount: money(input.tip), date, note: `Walk-in${WALK_IN_SEPARATOR}${name}${by}` });
  }
}

/** Walk-in sales between two dates, shaped like bookings for the appointment list. */
export async function loadWalkIns(from: string, to: string): Promise<ShopBooking[]> {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (await listEntries(from, to))
    .filter((e) => e.type === 'IN' && e.category === WALK_IN_CATEGORY)
    .map((e) => {
      const [serviceName, ...rest] = e.note.split(WALK_IN_SEPARATOR);
      const at = e.createdAt ? new Date(e.createdAt) : null;
      const minutes = at && !isNaN(at.getTime()) ? shopClock(at).minutes : 0;
      const time = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`;
      return {
        bookingId: e.id,
        bookingNumber: null,
        customerName: rest.join(WALK_IN_SEPARATOR) || 'Walk-in customer',
        customerPhone: '',
        serviceName: serviceName || 'Walk-in',
        date: e.date,
        startTime: `${e.date}T${time}`,
        status: 'COMPLETED',
        total: e.amount,
        walkIn: true,
      };
    });
}
