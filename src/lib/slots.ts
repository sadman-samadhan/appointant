// Free-time calculation shared by online booking (server) and the admin booking forms.
//
// The shop works one customer per chair, so a time is free only while fewer than
// SHOP_CAPACITY bookings (of ANY service) overlap it. All times are the shop's
// wall-clock time, in minutes since midnight; see wallClockDate/wallClockTime.
import { BUSINESS } from './business';
import { SHOP_CAPACITY } from './api/config';
import { wallClockDate } from './format';

export const SLOT_STEP_MINUTES = 30;

// Bookings in these states no longer hold a chair.
const RELEASED_STATUSES = ['CANCELLED', 'NO_SHOW'];

export interface BusyBooking {
  bookingId?: string;
  status?: string;
  startTime?: string | null;
  endTime?: string | null;
}

function clockToMinutes(text: string): number {
  const m = text.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return NaN;
  let h = Number(m[1]) % 12;
  if (!m[3]) h = Number(m[1]);
  else if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + Number(m[2]);
}

function isoMinutes(value?: string | null): number | null {
  const m = typeof value === 'string' ? value.match(/(?:T|^)(\d{2}):(\d{2})/) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`;
}

/** Opening and closing minutes for a YYYY-MM-DD date, or null when the shop is closed. */
export function openingHours(date: string): { open: number; close: number } | null {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return null;
  // BUSINESS.hours is Monday-first; getUTCDay() is Sunday = 0.
  const day = BUSINESS.hours[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
  if (!day?.open || !day?.close) return null;
  const open = clockToMinutes(day.open);
  const close = clockToMinutes(day.close);
  return Number.isFinite(open) && Number.isFinite(close) && close > open ? { open, close } : null;
}

/** Bookings on `date` that still hold a chair, as [start, end) minute ranges. */
function busyRanges(date: string, bookings: BusyBooking[], excludeBookingId?: string) {
  const ranges: { start: number; end: number }[] = [];
  for (const b of bookings) {
    if (!b || RELEASED_STATUSES.includes(String(b.status))) continue;
    if (excludeBookingId && b.bookingId === excludeBookingId) continue;
    if (wallClockDate(b.startTime) !== date) continue;
    const start = isoMinutes(b.startTime);
    if (start === null) continue;
    const end = isoMinutes(b.endTime);
    ranges.push({ start, end: end !== null && end > start ? end : start + SLOT_STEP_MINUTES });
  }
  return ranges;
}

function overlapping(ranges: { start: number; end: number }[], start: number, end: number) {
  return ranges.filter((r) => r.start < end && start < r.end).length;
}

/**
 * The backend stores shop wall-clock times as if they were UTC and refuses any time before
 * its own UTC clock. So until that is fixed, a time today is only accepted once it is later
 * than the current UTC time read as a wall-clock time (3-4 hours ahead of Fredericton).
 * Returns the first minute of `date` the backend accepts (Infinity: none).
 */
export function backendEarliestMinutes(date: string, now: Date = new Date()): number {
  const utcDate = now.toISOString().slice(0, 10);
  if (date < utcDate) return Infinity;
  if (date > utcDate) return -1;
  return now.getUTCHours() * 60 + now.getUTCMinutes();
}

export interface FreeTimesInput {
  date: string;
  durationMinutes: number;
  bookings: BusyBooking[];
  capacity?: number;
  /** Times at or before this minute of the day are not offered (used for "today"). */
  notBeforeMinutes?: number;
  /** Ignore this booking (when rescheduling it). */
  excludeBookingId?: string;
}

/** Free start times ("HH:MM:SS") on a date for a service of the given length. */
export function freeStartTimes(input: FreeTimesInput): string[] {
  const hours = openingHours(input.date);
  if (!hours) return [];
  const duration = Math.max(5, input.durationMinutes || SLOT_STEP_MINUTES);
  const capacity = input.capacity ?? SHOP_CAPACITY;
  const ranges = busyRanges(input.date, input.bookings, input.excludeBookingId);
  const out: string[] = [];
  const notBefore = Math.max(input.notBeforeMinutes ?? -1, backendEarliestMinutes(input.date));
  for (let start = hours.open; start + duration <= hours.close; start += SLOT_STEP_MINUTES) {
    if (start <= notBefore) continue;
    if (overlapping(ranges, start, start + duration) >= capacity) continue;
    out.push(minutesToTime(start));
  }
  return out;
}

/** True when a booking at `startTime` ("HH:MM[:SS]") would not overbook the shop. */
export function isTimeFree(input: Omit<FreeTimesInput, 'notBeforeMinutes'> & { startTime: string }): boolean {
  const start = isoMinutes(input.startTime);
  if (start === null) return false;
  const duration = Math.max(5, input.durationMinutes || SLOT_STEP_MINUTES);
  const capacity = input.capacity ?? SHOP_CAPACITY;
  return overlapping(busyRanges(input.date, input.bookings, input.excludeBookingId), start, start + duration) < capacity;
}

// ---- Barbers: who is working, and who is free at a time ----

/** One day of a barber's weekly schedule (dayOfWeek: 0 = Sunday), as set in Staff. */
export interface ScheduleDay {
  dayOfWeek: number;
  startTime?: string | null;
  endTime?: string | null;
  isActive?: boolean;
}

export interface BarberHours {
  staffId: string;
  name: string;
  /** No rows (or no row for a day): the barber works whenever the shop is open. */
  schedule: ScheduleDay[];
}

export interface BarberBusyBooking extends BusyBooking {
  staffId?: string;
}

/** Time blocked on one date (set under Staff → Days off & holidays): one barber, or the whole shop. */
export interface TimeBlock {
  /** No staffId: the whole shop is closed then. */
  staffId?: string;
  date: string;
  /** "HH:MM[:SS]"; a whole day is 00:00–23:59. */
  start: string;
  end: string;
}

function blocked(blocks: TimeBlock[] | undefined, date: string, start: number, end: number, staffId?: string) {
  return (blocks || []).some((b) => {
    if (b.date !== date || (b.staffId && b.staffId !== staffId)) return false;
    const from = isoMinutes(b.start) ?? 0;
    const to = isoMinutes(b.end) ?? 24 * 60;
    return from < end && start < (to >= 23 * 60 + 59 ? 24 * 60 : to);
  });
}

/** The minutes a barber works on a date (inside the shop's hours), or null when off. */
export function barberHours(barber: BarberHours, date: string): { open: number; close: number } | null {
  const shop = openingHours(date);
  if (!shop) return null;
  if (barber.schedule.length === 0) return shop;
  const [y, m, d] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const day = barber.schedule.find((s) => Number(s.dayOfWeek) === weekday);
  // A day without a row in the schedule counts as the shop's hours; a day switched off is off.
  if (!day) return shop;
  if (day.isActive === false) return null;
  const open = Math.max(shop.open, isoMinutes(day.startTime) ?? shop.open);
  const close = Math.min(shop.close, isoMinutes(day.endTime) ?? shop.close);
  return close > open ? { open, close } : null;
}

/**
 * Free start times on a date and, for each, the barbers free then (working, and with no
 * booking of their own overlapping). A booking with no barber (older bookings) takes one of
 * the free barbers, and the shop's chairs (SHOP_CAPACITY) are never exceeded.
 * With no barbers set up, this is the plain chair count (freeStartTimes) with no barbers.
 */
export function barberAvailability(
  input: Omit<FreeTimesInput, 'bookings'> & { barbers: BarberHours[]; bookings: BarberBusyBooking[]; blocks?: TimeBlock[] }
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const duration = Math.max(5, input.durationMinutes || SLOT_STEP_MINUTES);
  // A time the whole shop is closed (a holiday) is never offered.
  const shopTimes = freeStartTimes(input).filter((t) => {
    const start = isoMinutes(t) as number;
    return !blocked(input.blocks?.filter((b) => !b.staffId), input.date, start, start + duration);
  });
  if (input.barbers.length === 0) {
    for (const t of shopTimes) out.set(t, []);
    return out;
  }
  const ranges = (list: BarberBusyBooking[]) => busyRanges(input.date, list, input.excludeBookingId);
  const unassigned = ranges(input.bookings.filter((b) => !b.staffId));
  const perBarber = new Map(input.barbers.map((b) => [b.staffId, ranges(input.bookings.filter((x) => x.staffId === b.staffId))]));
  for (const t of shopTimes) {
    const start = isoMinutes(t) as number;
    const end = start + duration;
    const free = input.barbers
      .filter((b) => {
        const hours = barberHours(b, input.date);
        return (
          !!hours &&
          start >= hours.open &&
          end <= hours.close &&
          overlapping(perBarber.get(b.staffId) || [], start, end) === 0 &&
          // A day off or a few hours off for this barber.
          !blocked(input.blocks?.filter((x) => x.staffId), input.date, start, end, b.staffId)
        );
      })
      .map((b) => b.staffId);
    if (free.length > overlapping(unassigned, start, end)) out.set(t, free);
  }
  return out;
}

/** "Auto assign": of the barbers free at a time, the one with the fewest bookings that day. */
export function pickBarber(freeIds: string[], date: string, bookings: BarberBusyBooking[]): string | undefined {
  const load = (id: string) =>
    bookings.filter((b) => b.staffId === id && wallClockDate(b.startTime) === date && !RELEASED_STATUSES.includes(String(b.status))).length;
  return [...freeIds].sort((a, b) => load(a) - load(b))[0];
}
