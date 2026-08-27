import { AUTH_API_URL, CORE_API_URL, DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID } from './config';

const TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
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
    if (effectiveTenantId) {
      headers['x-tenant-id'] = effectiveTenantId;
      headers['X-Tenant-Id'] = effectiveTenantId;
    }
    if (branchId) {
      headers['x-branch-id'] = branchId;
      headers['X-Branch-Id'] = branchId;
    }
  }

  let res = await fetch(url, { ...restOptions, headers });

  // Handle 401 Unauthorized - attempt silent token refresh and retry
  if (res.status === 401 && !isAuthService) {
    const refreshed = await refreshAuthToken();
    if (refreshed) {
      const newToken = getStoredToken();
      if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { ...restOptions, headers });
    } else {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }
  }

  if (!res.ok) {
    let errorMessage = `API Error ${res.status}: ${res.statusText}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      /* fallback */
    }
    throw new Error(errorMessage);
  }

  const text = await res.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export async function refreshAuthToken(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    removeStoredToken();
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

  removeStoredToken();
  window.dispatchEvent(new CustomEvent('auth:expired'));
  return false;
}
