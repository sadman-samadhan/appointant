export const isBrowser = typeof window !== 'undefined';

export const AUTH_API_URL = isBrowser
  ? '/api/auth-proxy'
  : (process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://3.6.123.11:3302');

export const CORE_API_URL = isBrowser
  ? '/api/core-proxy'
  : (process.env.NEXT_PUBLIC_CORE_API_URL || 'http://3.6.123.11:3301');

// B Diamond Beauty Salon — Default multi-tenant constants
export const DEFAULT_TENANT_ID = '5c9d3520-65a7-4b84-be2f-acc21ea88bb4';
export const DEFAULT_BRANCH_ID = '189dc618-8fe1-410f-9ec3-c47026de2206';
export const CLIENT_NAME = 'B Diamond Beauty Salon';
export const DEFAULT_CURRENCY = 'CAD';
