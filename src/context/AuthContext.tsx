'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  apiRequest,
  ApiError,
  setStoredToken,
  setStoredRefreshToken,
  getStoredToken,
  removeStoredToken,
  refreshAuthToken,
  USER_INFO_KEY,
} from '@/lib/api/client';
import { DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID, CLIENT_NAME } from '@/lib/api/config';
import { toList } from '@/lib/format';
import {
  UserProfile,
  AuthResponse,
  RegisterRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from '@/lib/types';

type AppRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  /** A barber: staff who only see and work on their own appointments. */
  isBarber: boolean;
  tenantId: string;
  branchId: string;
  login: (userid: string, password: string) => Promise<UserProfile>;
  register: (req: RegisterRequest) => Promise<void>;
  forgotPassword: (userid: string) => Promise<any>;
  verifyOtp: (userid: string, otp: string) => Promise<{ resetToken: string }>;
  resetPassword: (req: ResetPasswordRequest) => Promise<void>;
  changePassword: (req: ChangePasswordRequest) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  logout: () => void;
  setCustomerSession: (customer: { name: string; phone?: string; email?: string }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_ROLE_CODES = ['ROLE_ADMIN', 'ADMIN', 'ROLE_OWNER', 'OWNER', 'ROLE_SUPER_ADMIN'];
const STAFF_ROLE_CODES = ['ROLE_STAFF', 'STAFF', 'ROLE_MANAGER', 'MANAGER', 'ROLE_EMPLOYEE'];

function collectRoleCodes(me: any): string[] {
  const codes: string[] = [];
  if (typeof me?.roleCode === 'string') codes.push(me.roleCode);
  if (Array.isArray(me?.roleCodes)) codes.push(...me.roleCodes);
  if (Array.isArray(me?.roles)) {
    for (const r of me.roles) codes.push(typeof r === 'string' ? r : r?.code || r?.roleCode);
  }
  return codes.filter(Boolean).map((c) => String(c).toUpperCase());
}

// The ACTIVE staff record linked to this account (by user id, or by email), if any.
// A non-admin account counts as staff only if it has one.
async function activeStaffRecord(me: any): Promise<any | null> {
  try {
    const res = await apiRequest<any>(`/api/v1/staff?tenantId=${DEFAULT_TENANT_ID}`);
    const email = String(me.email || me.userid || '').toLowerCase();
    const mine = toList(res, 'staff').filter((s: any) => s.status === 'ACTIVE');
    return (
      mine.find((s: any) => s.userId != null && String(s.userId) === String(me.id)) ||
      mine.find((s: any) => !!email && String(s.email || '').toLowerCase() === email) ||
      null
    );
  } catch {
    return null;
  }
}

// The role is derived only from what the Auth Service says about the signed-in user,
// never from the text of the email address.
const NOT_SHOP_MEMBER_MESSAGE =
  `This account isn't linked to ${CLIENT_NAME}. Please sign in with the shop owner's or a staff member's account.`;

class NotShopMemberError extends Error {
  constructor() {
    super(NOT_SHOP_MEMBER_MESSAGE);
    this.name = 'NotShopMemberError';
  }
}

// Auth Service roles are global; the Core Backend decides roles per shop: the shop's
// owner is its admin, and active staff are staff (even "Store Administrators", whose
// global ROLE_ADMIN no longer counts in this shop). Accounts linked to neither get 403.
async function resolveShopRole(me: any, fallback: AppRole): Promise<AppRole> {
  try {
    const tenant = await apiRequest<any>(`/api/v1/tenants/${DEFAULT_TENANT_ID}`);
    return tenant?.ownerUserId != null && String(tenant.ownerUserId) === String(me.id) ? 'ADMIN' : 'STAFF';
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) throw new NotShopMemberError();
    return fallback; // network blip: keep the role from the token; the backend still enforces
  }
}

async function resolveProfile(me: any): Promise<UserProfile> {
  const codes = collectRoleCodes(me);
  const staff = await activeStaffRecord(me);
  let role: AppRole = 'CUSTOMER';
  if (codes.some((c) => ADMIN_ROLE_CODES.includes(c))) role = 'ADMIN';
  else if (codes.some((c) => STAFF_ROLE_CODES.includes(c))) role = 'STAFF';
  else if (staff) role = 'STAFF';

  if (role !== 'CUSTOMER') role = await resolveShopRole(me, role);
  const isBarber = role === 'STAFF' && !!staff && /barber/i.test(String(staff.roleTitle || ''));

  return {
    id: me.id ?? me.userId,
    name: me.name || me.fullName || String(me.userid || '').split('@')[0] || 'User',
    userid: me.userid || me.email || '',
    email: me.email || (String(me.userid || '').includes('@') ? me.userid : undefined),
    phone: me.phone || me.mobile,
    status: me.status,
    role,
    roleCode: codes[0],
    roleName: role === 'ADMIN' ? 'Salon Owner / Administrator' : isBarber ? 'Barber' : role === 'STAFF' ? 'Staff Specialist' : 'Customer',
    staffId: staff?.staffId ? String(staff.staffId) : undefined,
    isBarber,
  };
}

function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tenantId = DEFAULT_TENANT_ID;
  const branchId = DEFAULT_BRANCH_ID;

  const isAdmin = !!token && user?.role === 'ADMIN';
  const isStaff = !!token && user?.role === 'STAFF';
  const isBarber = isStaff && !!user?.isBarber;

  const clearSession = useCallback(() => {
    removeStoredToken();
    localStorage.removeItem(USER_INFO_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const fetchMe = useCallback(async (): Promise<any> => {
    try {
      return await apiRequest<any>('/users/me', { isAuthService: true });
    } catch (err) {
      // Access token may simply be stale: rotate it once and retry.
      if (isUnauthorized(err) && (await refreshAuthToken())) {
        return await apiRequest<any>('/users/me', { isAuthService: true });
      }
      throw err;
    }
  }, []);

  const refreshUserProfile = useCallback(async () => {
    if (!getStoredToken()) return;
    try {
      const me = await fetchMe();
      const profile = await resolveProfile(me);
      setUser(profile);
      setToken(getStoredToken());
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(profile));
    } catch (err) {
      if (isUnauthorized(err) || err instanceof NotShopMemberError) clearSession();
      /* otherwise (network blip) keep the cached profile; the backend still enforces auth */
    }
  }, [fetchMe, clearSession]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
    };

    const handleAuthRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent<{ token: string }>;
      if (customEvent.detail?.token) {
        setToken(customEvent.detail.token);
      }
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    window.addEventListener('auth:refreshed', handleAuthRefreshed);

    // Periodic silent refresh every 8 minutes (token lifespan is 15 minutes)
    const refreshInterval = setInterval(() => {
      if (getStoredToken()) {
        refreshAuthToken().catch(() => {});
      }
    }, 8 * 60 * 1000);

    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired);
      window.removeEventListener('auth:refreshed', handleAuthRefreshed);
      clearInterval(refreshInterval);
    };
  }, []);

  // Restore a saved session, but only after the Auth Service confirms the token is still valid.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = getStoredToken();
      if (!t) {
        localStorage.removeItem(USER_INFO_KEY);
        setIsLoading(false);
        return;
      }
      try {
        const cached = localStorage.getItem(USER_INFO_KEY);
        if (cached) setUser(JSON.parse(cached));
      } catch {
        /* ignore corrupt cache */
      }
      setToken(t);
      await refreshUserProfile();
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUserProfile]);

  const login = async (userid: string, password: string) => {
    // Any non-2xx answer (e.g. 401 "Invalid userid or password") throws here.
    const data = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      isAuthService: true,
      body: JSON.stringify({ userid, password }),
    });

    if (!data?.access_token) {
      throw new Error('Sign-in failed: the server did not return a session token.');
    }

    setStoredToken(data.access_token);
    if (data.refresh_token) setStoredRefreshToken(data.refresh_token);

    try {
      const me = await apiRequest<any>('/users/me', { isAuthService: true });
      const profile = await resolveProfile(me);
      setToken(data.access_token);
      setUser(profile);
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(profile));
      return profile;
    } catch (err) {
      clearSession();
      if (err instanceof NotShopMemberError) throw err;
      throw new Error('Signed in, but your profile could not be loaded. Please try again.');
    }
  };

  const register = async (req: RegisterRequest) => {
    await apiRequest('/auth/register', {
      method: 'POST',
      isAuthService: true,
      body: JSON.stringify(req),
    });
  };

  const forgotPassword = async (userid: string) => {
    return await apiRequest('/auth/forgot-password', {
      method: 'POST',
      isAuthService: true,
      body: JSON.stringify({ userid }),
    });
  };

  const verifyOtp = async (userid: string, otp: string) => {
    return await apiRequest<{ resetToken: string }>('/auth/verify-otp', {
      method: 'POST',
      isAuthService: true,
      body: JSON.stringify({ userid, otp }),
    });
  };

  const resetPassword = async (req: ResetPasswordRequest) => {
    await apiRequest('/auth/reset-password', {
      method: 'POST',
      isAuthService: true,
      body: JSON.stringify(req),
    });
  };

  const changePassword = async (req: ChangePasswordRequest) => {
    await apiRequest('/users/me/password', {
      method: 'PUT',
      isAuthService: true,
      body: JSON.stringify(req),
    });
  };

  // Remembers a guest's contact details after an online booking. It never grants a
  // session and never overrides a signed-in user.
  const setCustomerSession = (customer: { name: string; phone?: string; email?: string }) => {
    if (getStoredToken()) return;
    const profile: UserProfile = {
      name: customer.name,
      userid: customer.phone || customer.email || customer.name,
      phone: customer.phone,
      mobile: customer.phone,
      email: customer.email || '',
      role: 'CUSTOMER',
    };
    setUser(profile);
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(profile));
  };

  const logout = () => {
    apiRequest('/auth/logout', { method: 'POST', isAuthService: true }).catch(() => {});
    clearSession();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        isAdmin,
        isStaff,
        isBarber,
        tenantId,
        branchId,
        login,
        register,
        forgotPassword,
        verifyOtp,
        resetPassword,
        changePassword,
        refreshUserProfile,
        logout,
        setCustomerSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
