// North American phone numbers, shown as (123)-456-7890 everywhere in the app.

export function phoneDigits(value: unknown): string {
  let d = String(value ?? '').replace(/\D/g, '');
  // Accept a leading country code 1 (e.g. +1 506 ...).
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d;
}

export function isValidPhone(value: unknown): boolean {
  const d = phoneDigits(value);
  // Area code and exchange can't start with 0 or 1.
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(d);
}

/** Formats as the user types: "506" → "(506)", "5065551" → "(506)-555-1". */
export function formatPhoneInput(value: string): string {
  const d = phoneDigits(value).slice(0, 10);
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)})-${d.slice(3)}`;
  return `(${d.slice(0, 3)})-${d.slice(3, 6)}-${d.slice(6)}`;
}

export function formatPhone(value: unknown): string {
  const d = phoneDigits(value);
  return d.length === 10 ? `(${d.slice(0, 3)})-${d.slice(3, 6)}-${d.slice(6)}` : String(value ?? '');
}

export const PHONE_PLACEHOLDER = '(506)-555-1234';
export const PHONE_ERROR = 'Enter a 10-digit phone number, like (506)-555-1234.';
