import 'server-only';
import type { NextRequest } from 'next/server';
import { DEFAULT_TENANT_ID } from '@/lib/api/config';
import './shopCode';
import { toList, toNumber } from '@/lib/format';
import { billFor, finishAndPay, type ShopBooking } from '@/lib/shopBookings';
import { accountFromRequest } from './customerAccount';
import { AgentError, agentRequest } from './shopAgent';

// The backend lets only the owner make bills and record money, so when a barber takes the
// payment for their own customer, this server does it with the shop's account and writes
// the barber's name on the payment (see finishAndPay) for the day's cash-up.


export interface Barber {
  staffId: string;
  name: string;
}

/** The signed-in barber behind the request (an active staff member whose job title says "Barber"). */
export async function barberFromRequest(req: NextRequest): Promise<Barber> {
  const account = await accountFromRequest(req);
  if (!account) throw new AgentError('Please sign in again.', 401);
  const res = await agentRequest('GET', `/api/v1/staff?tenantId=${DEFAULT_TENANT_ID}&limit=100`);
  const active = toList<any>(res, 'staff').filter((s) => s?.status === 'ACTIVE');
  const me =
    active.find((s) => s.userId != null && String(s.userId) === account.id) ||
    active.find((s) => String(s.email || '').trim().toLowerCase() === account.email);
  if (!me || !/barber/i.test(String(me.roleTitle || ''))) throw new AgentError('Only barbers can take payments here.', 403);
  return { staffId: String(me.staffId), name: String(me.fullName || account.name).trim() };
}

/** The barber's own arrived booking, shaped for the payment code. */
async function arrivedBookingOf(barber: Barber, bookingId: string): Promise<ShopBooking> {
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) throw new AgentError('Booking not found.', 404);
  const d = await agentRequest('GET', `/api/v1/bookings/${bookingId}`);
  if (String(d?.staff?.id || '') !== barber.staffId) throw new AgentError('This appointment is not yours.', 403);
  if (d?.status !== 'CHECKED_IN') throw new AgentError('Mark the customer as arrived first.', 400);
  return {
    bookingId,
    bookingNumber: d.bookingNumber || null,
    customerId: d.customer?.id,
    customerName: d.customer?.name || 'Customer',
    customerPhone: '',
    serviceId: d.service?.id,
    serviceName: d.service?.name || 'Service',
    date: String(d.startTime || '').slice(0, 10),
    startTime: d.startTime,
    status: d.status,
    total: toNumber(d.totalPrice),
  };
}

/** What the customer owes (makes the bill if needed). */
export async function barberAmountDue(barber: Barber, bookingId: string): Promise<{ totalDue: number; price: number }> {
  const { totalDue, price } = await billFor(await arrivedBookingOf(barber, bookingId), { create: false });
  return { totalDue, price };
}

/** Takes the payment, marks the appointment done and records the barber as having taken it. */
export async function barberTakePayment(barber: Barber, bookingId: string, tip: number, card = false): Promise<number> {
  const booking = await arrivedBookingOf(barber, bookingId);
  return finishAndPay(booking, { tip: tip > 0 ? Math.round(tip * 100) / 100 : 0, takenBy: barber.name, paidWith: card ? 'BANK' : 'CASH' });
}
