// North American phone numbers. People may type them any way they like (5068971234,
// 506 897 1234, 506.897.1234, +1 (506) 897-1234); the app stores and shows (123)-456-7890.

export function phoneDigits(value: unknown): string {
  let d = String(value ?? '').replace(/\D/g, '');
  // Accept a leading country code 1 (e.g. +1 506 ...).
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d;
}

/** Any 10-digit number (an optional leading +1 is fine), whatever the spacing or punctuation. */
export function isValidPhone(value: unknown): boolean {
  return /^\d{10}$/.test(phoneDigits(value));
}

/** Keeps what the person types (digits, spaces, + ( ) - .) and drops anything else. */
export function formatPhoneInput(value: string): string {
  return value.replace(/[^\d\s+().-]/g, '').slice(0, 20);
}

export function formatPhone(value: unknown): string {
  const d = phoneDigits(value);
  return d.length === 10 ? `(${d.slice(0, 3)})-${d.slice(3, 6)}-${d.slice(6)}` : String(value ?? '');
}

export const PHONE_PLACEHOLDER = '506 555 1234';
export const PHONE_ERROR = 'Enter a 10-digit phone number, like 506 555 1234.';
