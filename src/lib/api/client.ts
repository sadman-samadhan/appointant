import { AUTH_API_URL, CORE_API_URL, DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID } from './config';

const TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
export const USER_INFO_KEY = 'bdiamond_user_info';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredRefreshToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
}

export function setStoredToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function removeStoredToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestOptions extends RequestInit {
  isAuthService?: boolean;
  tenantId?: string;
  branchId?: string;
}

export function getActiveTenantId(): string {
  return DEFAULT_TENANT_ID;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    isAuthService = false,
    tenantId = DEFAULT_TENANT_ID,
    branchId = DEFAULT_BRANCH_ID,
    headers: customHeaders = {},
    ...restOptions
  } = options;

  const effectiveTenantId = tenantId || DEFAULT_TENANT_ID;
  const baseUrl = isAuthService ? AUTH_API_URL : CORE_API_URL;
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  let token = getStoredToken();

  // If access token is absent but refresh token exists, attempt refresh first
  if (!token && typeof window !== 'undefined' && localStorage.getItem(REFRESH_TOKEN_KEY) && !isAuthService) {
    const refreshed = await refreshAuthToken();
    if (refreshed) {
      token = getStoredToken();
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isAuthService) {
    // Header names are case-insensitive: setting both spellings makes fetch join
    // them into "id, id", which the backend rejects as an unknown tenant.
    if (effectiveTenantId) headers['x-tenant-id'] = effectiveTenantId;
    if (branchId) headers['x-branch-id'] = branchId;
  }

  let res = await fetch(url, { ...restOptions, headers });

  // Handle 401 Unauthorized - attempt silent token refresh and retry
  // (never for the /auth/* endpoints themselves, e.g. a failed login)
  const isAuthEndpoint = isAuthService && path.replace(/^\//, '').startsWith('auth/');
  if (res.status === 401 && token && !isAuthEndpoint) {
    const refreshed = await refreshAuthToken();
    if (refreshed) {
      const newToken = getStoredToken();
      if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { ...restOptions, headers });
    }
  }

  if (!res.ok) {
    let errorMessage = `API Error ${res.status}: ${res.statusText}`;
    try {
      const errorData = await res.json();
      const msg = errorData.message || errorData.error;
      if (msg) errorMessage = Array.isArray(msg) ? msg.join('; ') : String(msg);
    } catch {
      /* fallback */
    }
    throw new ApiError(errorMessage, res.status);
  }

  const text = await res.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

// Refresh tokens rotate on every use, so concurrent 401s must share a single
// refresh request; otherwise the second call presents a spent token and logs the user out.
export function refreshAuthToken(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    clearSession();
    return false;
  }

  try {
    const res = await fetch(`${AUTH_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        setStoredToken(data.access_token);
        if (data.refresh_token) {
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
        }
        window.dispatchEvent(
          new CustomEvent('auth:refreshed', { detail: { token: data.access_token } })
        );
        return true;
      }
    }
  } catch {
    /* network or parsing failure */
  }

  clearSession();
  return false;
}

function clearSession() {
  removeStoredToken();
  localStorage.removeItem(USER_INFO_KEY);
  window.dispatchEvent(new CustomEvent('auth:expired'));
}
