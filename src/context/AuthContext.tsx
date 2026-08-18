'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, setStoredToken, getStoredToken, removeStoredToken } from '@/lib/api/client';
import { DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID } from '@/lib/api/config';
import { UserProfile, AuthResponse } from '@/lib/types';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tenantId: string;
  branchId: string;
  login: (userid: string, password: string, targetRole?: 'ADMIN' | 'CUSTOMER') => Promise<void>;
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

  useEffect(() => {
    const t = getStoredToken();
    const u = localStorage.getItem('bdiamond_user_info');
    if (t) {
      setToken(t);
    }
    if (u) {
      try {
        setUser(JSON.parse(u));
      } catch {
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

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
        throw new Error('Invalid server response: Access token missing.');
      }

      setStoredToken(data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('auth_refresh_token', data.refresh_token);
      }
      setToken(data.access_token);

      let profile: UserProfile = {
        name: targetRole === 'ADMIN' ? 'B Diamond Business Owner' : userid.split('@')[0],
        userid,
        email: userid,
        role: targetRole,
      };

      try {
        const me = await apiRequest<UserProfile>('/users/me', { isAuthService: true });
        if (me && me.name) {
          profile = { ...me, role: targetRole };
        }
      } catch {
        /* fallback to default profile */
      }

      setUser(profile);
      localStorage.setItem('bdiamond_user_info', JSON.stringify(profile));
    } finally {
      setIsLoading(false);
    }
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
        isAuthenticated: !!user || !!token,
        isLoading,
        tenantId,
        branchId,
        login,
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
