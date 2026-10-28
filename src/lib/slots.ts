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
