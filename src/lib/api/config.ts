export const isBrowser = typeof window !== 'undefined';

export const AUTH_API_URL = isBrowser
  ? '/api/auth-proxy'
  : (process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://3.6.123.11:3302');

export const CORE_API_URL = isBrowser
  ? '/api/core-proxy'
  : (process.env.NEXT_PUBLIC_CORE_API_URL || 'http://3.6.123.11:3301');

// B Diamond Barbershop — Default multi-tenant constants
export const DEFAULT_TENANT_ID = '5c9d3520-65a7-4b84-be2f-acc21ea88bb4';
// The shop has a single branch (Downtown Main Branch, 593 King Street); every request defaults to it.
// Override with NEXT_PUBLIC_BRANCH_ID if the shop ever moves to a different branch record.
export const DEFAULT_BRANCH_ID = process.env.NEXT_PUBLIC_BRANCH_ID || '065f43af-56ad-4ce3-91f3-436f024493a7';
export const CLIENT_NAME = 'B Diamond Barbershop';
export const DEFAULT_CURRENCY = 'CAD';

// How many customers the shop can serve at the same time (chairs/barbers working at once).
// Every service gets a capacity rule with this limit so online booking never double-books.
export const SHOP_CAPACITY = Number(process.env.NEXT_PUBLIC_SHOP_CAPACITY) || 3;
