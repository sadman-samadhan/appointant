export const isBrowser = typeof window !== 'undefined';

export const AUTH_API_URL = isBrowser
  ? '/api/auth-proxy'
  : (process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://3.6.123.11:3302');

export const CORE_API_URL = isBrowser
  ? '/api/core-proxy'
  : (process.env.NEXT_PUBLIC_CORE_API_URL || 'http://3.6.123.11:3301');

// AM Barbershop — the shop's account (tenant) and its single branch in the salon system.
// Both must be set (NEXT_PUBLIC_TENANT_ID, NEXT_PUBLIC_BRANCH_ID): this build never falls back to
// another shop's account, so nobody sees or changes another shop's customers by mistake.
// The AM values are filled in once the backend team creates the AM Barbershop account.
const AM_TENANT_ID = '5661adfe-4260-4ad0-b51f-abaddb7f2723';
const AM_BRANCH_ID = '41e89117-f008-47bb-a68c-c6f90dd9637a'; // Main Branch (maple-main)
export const DEFAULT_TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || AM_TENANT_ID;
export const DEFAULT_BRANCH_ID = process.env.NEXT_PUBLIC_BRANCH_ID || AM_BRANCH_ID;
export const CLIENT_NAME = 'AM Barbershop';
export const DEFAULT_CURRENCY = 'CAD';

// How many customers the shop can serve at the same time (chairs/barbers working at once).
// A time slot is offered only while fewer bookings than this overlap it (any service).
// The backend availability engine also gets this limit as each service's capacity rule.
export const SHOP_CAPACITY = Number(process.env.NEXT_PUBLIC_SHOP_CAPACITY) || 2;
