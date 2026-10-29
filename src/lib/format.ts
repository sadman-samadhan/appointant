// The core backend serializes decimals as strings (e.g. "25.00"), so every
// numeric field coming from the API must be coerced before doing math or
// calling number methods on it.
export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export function formatMoney(value: unknown): string {
  return toNumber(value).toFixed(2);
}

// Services expose `basePrice` (string); older mock data used `price`.
export function servicePrice(service: any): number {
  return toNumber(service?.price ?? service?.basePrice);
}

export function serviceDuration(service: any): number {
  return toNumber(service?.durationMinutes ?? service?.baseDurationMinutes, 30);
}

// Normalizes the many list envelopes the backend uses ({items}, {bookings}, bare array...).
export function toList<T = any>(res: any, ...keys: string[]): T[] {
  if (Array.isArray(res)) return res;
  for (const key of [...keys, 'items', 'data']) {
    if (Array.isArray(res?.[key])) return res[key];
  }
  return [];
}

// The shop is in Fredericton. "Today" and "now" are always the shop's, whatever the time
// zone of the device in use (e.g. an owner or developer abroad), so a day's money and
// appointments land on the shop's day.
export const SHOP_TIME_ZONE = 'America/Moncton';

/** The shop's calendar date and minutes since midnight at `at`. */
export function shopClock(at: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

/** Today's date at the shop (YYYY-MM-DD). */
export function todayISO(): string {
  return shopClock().date;
}

// Booking times are the shop's local wall-clock time. The backend stores them with a
// "Z" suffix even though they are not UTC, so never pass them through `new Date()`
// (that would shift them into the viewer's time zone). Read the digits as written.
export function wallClockDate(value?: string | null): string {
  const m = typeof value === 'string' ? value.match(/^(\d{4}-\d{2}-\d{2})/) : null;
  return m ? m[1] : '';
}

export function wallClockTime(value?: string | null): string {
  const m = typeof value === 'string' ? value.match(/(?:T|^)(\d{2}):(\d{2})/) : null;
  if (!m) return '--:--';
  const h = Number(m[1]);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${suffix}`;
}

// A Date whose *local* fields equal the booking's wall-clock time, for code that formats
// with toLocale*(). Accepts an ISO-ish startTime, or a date + "HH:MM:SS" pair.
export function bookingLocalDate(b: { date?: unknown; startTime?: unknown } | null | undefined): Date | null {
  const start = typeof b?.startTime === 'string' ? b.startTime : '';
  const day = wallClockDate(start) || wallClockDate(typeof b?.date === 'string' ? b.date : '');
  const time = start.match(/(?:T|^)(\d{2}):(\d{2})/);
  if (!day) return null;
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, time ? Number(time[1]) : 0, time ? Number(time[2]) : 0);
}

/** Whether two typed names are the same person's name (ignores case and extra spaces). */
export function sameName(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  return norm(a) !== '' && norm(a) === norm(b);
}
