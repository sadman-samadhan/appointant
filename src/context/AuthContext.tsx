'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, setStoredToken, getStoredToken, removeStoredToken, refreshAuthToken } from '@/lib/api/client';
import { DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID } from '@/lib/api/config';
import {
  UserProfile,
  AuthResponse,
  RegisterRequest,
  ForgotPasswordRequest,
  VerifyOtpRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from '@/lib/types';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  tenantId: string;
  branchId: string;
  login: (userid: string, password: string, targetRole?: 'ADMIN' | 'CUSTOMER') => Promise<UserProfile>;
  register: (req: RegisterRequest) => Promise<void>;
  forgotPassword: (userid: string) => Promise<any>;
  verifyOtp: (userid: string, otp: string) => Promise<{ resetToken: string }>;
  resetPassword: (req: ResetPasswordRequest) => Promise<void>;
  changePassword: (req: ChangePasswordRequest) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  logout: () => void;
  setCustomerSession: (customer: { name: string; phone?: string; email?: string }) => void;
  setUserRole: (role: 'ADMIN' | 'CUSTOMER' | 'STAFF') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId] = useState(DEFAULT_TENANT_ID);
  const [branchId] = useState(DEFAULT_BRANCH_ID);

  const isOwnerOrAdmin = (u: UserProfile | null): boolean => {
    if (!u) return false;
    const uid = (u.userid || u.email || '').toLowerCase();
    return (
      uid === 'bdiamond.owner@system.com' ||
      uid.includes('owner') ||
      uid.includes('admin') ||
      u.roleCode === 'ADMIN' ||
      u.roleCode === 'ROLE_ADMIN' ||
      (u.role === 'ADMIN' && u.roleCode !== 'STAFF' && u.roleCode !== 'ROLE_USER')
    );
  };

  const isAdmin = isOwnerOrAdmin(user);
  const isStaff = !isAdmin && !!user && user.role !== 'CUSTOMER';

  const refreshUserProfile = useCallback(async () => {
    const activeToken = getStoredToken();
    if (!activeToken) return;

    try {
      const me = await apiRequest<any>('/users/me', { isAuthService: true });
      if (me) {
        setUser((prev) => {
          const uid = (me.userid || me.email || prev?.userid || '').toLowerCase();
          const isActualAdmin =
            uid === 'bdiamond.owner@system.com' ||
            uid.includes('admin') ||
            uid.includes('owner') ||
            me.roleCode === 'ADMIN' ||
            me.roleCode === 'ROLE_ADMIN' ||
            (me.roleCodes && me.roleCodes.includes('ROLE_ADMIN'));

          const resolvedRole: 'ADMIN' | 'STAFF' | 'CUSTOMER' = isActualAdmin
            ? 'ADMIN'
            : prev?.role === 'CUSTOMER'
            ? 'CUSTOMER'
            : 'STAFF';

          const updated: UserProfile = {
            id: me.id || me.userId || prev?.id,
            name: me.name || prev?.name || (isActualAdmin ? 'B Diamond Owner' : 'Specialist'),
            userid: me.userid || prev?.userid || '',
            email: me.email || me.userid || prev?.email,
            phone: me.phone || me.mobile || prev?.phone,
            role: resolvedRole,
            roleName:
              resolvedRole === 'ADMIN'
                ? 'Salon Owner / Administrator'
                : resolvedRole === 'STAFF'
                ? 'Staff Specialist'
                : 'Customer',
            roleCode: isActualAdmin ? 'ADMIN' : (me.roleCode || 'STAFF'),
          };
          localStorage.setItem('bdiamond_user_info', JSON.stringify(updated));
          return updated;
        });
      }
    } catch {
      /* token might be invalid or expired */
    }
  }, []);

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

  useEffect(() => {
    const t = getStoredToken();
    const u = typeof window !== 'undefined' ? localStorage.getItem('bdiamond_user_info') : null;
    if (t) {
      setToken(t);
      if (u) {
        try {
          setUser(JSON.parse(u));
        } catch {
          setUser(null);
        }
      }
      refreshUserProfile();
    } else {
      setToken(null);
      setUser(null);
    }
    setIsLoading(false);
  }, [refreshUserProfile]);

  const login = async (
    userid: string,
    password: string,
    targetRole: 'ADMIN' | 'CUSTOMER' = 'ADMIN'
  ) => {
    setIsLoading(true);
    try {
      const data = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        isAuthService: true,
        body: JSON.stringify({ userid, password }),
      });

      if (!data.access_token) {
        throw new Error('Invalid response from Auth Service: Access token missing.');
      }

      setStoredToken(data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('auth_refresh_token', data.refresh_token);
      }
      setToken(data.access_token);

      const uid = (userid || '').toLowerCase();
      const isActualAdmin =
        uid === 'bdiamond.owner@system.com' ||
        uid.includes('owner') ||
        uid.includes('admin');

      let resolvedRole: 'ADMIN' | 'STAFF' | 'CUSTOMER' =
        targetRole === 'CUSTOMER' ? 'CUSTOMER' : isActualAdmin ? 'ADMIN' : 'STAFF';

      let profile: UserProfile = {
        name: isActualAdmin ? 'B Diamond Owner' : userid.split('@')[0],
        userid,
        email: userid.includes('@') ? userid : undefined,
        phone: !userid.includes('@') ? userid : undefined,
        role: resolvedRole,
        roleCode: isActualAdmin ? 'ADMIN' : (targetRole === 'CUSTOMER' ? 'USER' : 'STAFF'),
      };

      try {
        const me = await apiRequest<any>('/users/me', { isAuthService: true });
        if (me) {
          const userId = me.id || me.userId;
          const meUid = (me.userid || me.email || userid).toLowerCase();
          const isAdminRole =
            me.roleCode === 'ADMIN' ||
            me.roleCode === 'ROLE_ADMIN' ||
            (me.roleCodes && me.roleCodes.includes('ROLE_ADMIN')) ||
            meUid === 'bdiamond.owner@system.com' ||
            meUid.includes('owner') ||
            meUid.includes('admin');

          if (isAdminRole) {
            resolvedRole = 'ADMIN';
          } else if (targetRole === 'CUSTOMER' && me.roleCode !== 'STAFF') {
            resolvedRole = 'CUSTOMER';
          } else {
            resolvedRole = 'STAFF';
          }

          profile = {
            id: userId,
            name: me.name || (resolvedRole === 'ADMIN' ? 'B Diamond Owner' : userid.split('@')[0]),
            userid: me.userid || userid,
            email: me.email || (userid.includes('@') ? userid : undefined),
            phone: me.phone || me.mobile || (!userid.includes('@') ? userid : undefined),
            role: resolvedRole,
            roleName:
              resolvedRole === 'ADMIN'
                ? 'Salon Owner / Administrator'
                : resolvedRole === 'STAFF'
                ? 'Staff Specialist'
                : 'Customer',
            roleCode: resolvedRole === 'ADMIN' ? 'ADMIN' : (resolvedRole === 'STAFF' ? 'STAFF' : 'USER'),
          };
        }
      } catch {
        /* fallback to profile */
      }

      setUser(profile);
      localStorage.setItem('bdiamond_user_info', JSON.stringify(profile));
      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (req: RegisterRequest) => {
    setIsLoading(true);
    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        isAuthService: true,
        body: JSON.stringify(req),
      });
    } finally {
      setIsLoading(false);
    }
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

  const setCustomerSession = (customer: { name: string; phone?: string; email?: string }) => {
    const profile: UserProfile = {
      name: customer.name,
      userid: customer.phone || customer.email || customer.name,
      phone: customer.phone,
      mobile: customer.phone,
      email: customer.email || '',
      role: 'CUSTOMER',
    };
    setUser(profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bdiamond_user_info', JSON.stringify(profile));
    }
  };

  const logout = () => {
    try {
      apiRequest('/auth/logout', { method: 'POST', isAuthService: true }).catch(() => {});
    } catch {
      /* ignore */
    }
    removeStoredToken();
    localStorage.removeItem('bdiamond_user_info');
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const setUserRole = (role: 'ADMIN' | 'CUSTOMER' | 'STAFF') => {
    if (user) {
      const updated = { ...user, role };
      setUser(updated);
      localStorage.setItem('bdiamond_user_info', JSON.stringify(updated));
    }
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
        setUserRole,
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
