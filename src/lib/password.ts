// The Auth Service only accepts strong passwords; check them before sending.
export const PASSWORD_RULES =
  'At least 10 characters, with an uppercase letter, a lowercase letter, a number and a symbol (like ! # $).';

export function isStrongPassword(p: string): boolean {
  return p.length >= 10 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(p);
}
