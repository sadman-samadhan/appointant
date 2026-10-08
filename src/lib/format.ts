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

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
