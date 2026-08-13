'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { Lock, Mail, Shield, User, Scissors, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { settings } = useTheme();
  const { showError, showSuccess } = useToast();

  const [userid, setUserid] = useState('admin@system.com');
  const [password, setPassword] = useState('123456789');
  const [targetRole, setTargetRole] = useState<'ADMIN' | 'CUSTOMER'>('ADMIN');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(userid, password, targetRole);
      showSuccess('Authenticated Successfully', `Welcome back to ${settings.siteName}!`);
      if (targetRole === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/customer/profile');
      }
    } catch (err: any) {
      showError('Authentication Failed', err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = (role: 'ADMIN' | 'CUSTOMER') => {
    setTargetRole(role);
    if (role === 'ADMIN') {
      setUserid('admin@system.com');
      setPassword('123456789');
    } else {
      setUserid('customer@example.com');
      setPassword('123456789');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden glass-card shadow-2xl border border-[var(--border)]">
        {/* Left Branded Hero Panel */}
        <div className="p-8 lg:p-12 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Scissors className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              {settings.siteName}
            </h1>
            <p className="text-xs sm:text-sm opacity-90 leading-relaxed font-medium">
              {settings.tagline} — Fredericton Downtown Main Branch
            </p>
          </div>

          <div className="space-y-3 relative z-10 pt-8 border-t border-white/10 text-xs opacity-80">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-300" />
              <span>Multi-Tenant Enforced Session Protocol</span>
            </div>
            <p>Phase 1 Cash Register & Staff Management Deployment.</p>
          </div>

          {/* Decorative background circle */}
          <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        </div>

        {/* Right Form Panel */}
        <div className="p-8 lg:p-12 space-y-6 bg-[var(--card)]">
          <div className="space-y-2">
            <h2 className="text-xl font-black text-[var(--foreground)] tracking-tight">Sign In Portal</h2>
            <p className="text-xs text-[var(--muted-foreground)] font-medium">
              Access your salon dashboard or customer portal.
            </p>
          </div>

          {/* Role selector tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
            <button
              type="button"
              onClick={() => handleDemoFill('ADMIN')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                targetRole === 'ADMIN'
                  ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Owner / Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoFill('CUSTOMER')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                targetRole === 'CUSTOMER'
                  ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Customer</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                User ID / Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={userid}
                  onChange={(e) => setUserid(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  placeholder="admin@system.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 mt-2"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Pre-fill helper */}
          <div className="pt-4 border-t border-[var(--border)] text-center space-y-1.5">
            <p className="text-[11px] text-[var(--muted-foreground)] font-medium">Quick Credentials Helper:</p>
            <p className="text-xs font-mono font-bold text-[var(--foreground)]">
              {targetRole === 'ADMIN' ? 'admin@system.com' : 'customer@example.com'} / 123456789
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
