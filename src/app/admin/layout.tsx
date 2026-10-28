'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar, MobileNav, ADMIN_ONLY_ROUTES } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, LogIn, RefreshCw } from 'lucide-react';

function GateMessage({ title, message, children }: { title: string; message: string; children?: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-[var(--border)] shadow-xl text-center space-y-5 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-[var(--foreground)]">{title}</h2>
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{message}</p>
        </div>
        <div className="space-y-2 pt-2">{children}</div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, isAdmin, isStaff, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <RefreshCw className="w-6 h-6 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <GateMessage
        title="Sign In Required"
        message="Your session has expired or you are not signed in. Please sign in to access salon records."
      >
        <Link
          href="/login"
          className="w-full btn-primary py-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-sm"
        >
          <LogIn className="w-4 h-4" />
          <span>Go to Sign In</span>
        </Link>
      </GateMessage>
    );
  }

  if (!isAdmin && !isStaff) {
    return (
      <GateMessage
        title="Staff Area"
        message="This part of the site is only for salon owners and staff. Your account is a customer account."
      >
        <Link
          href="/customer/profile"
          className="w-full btn-primary py-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-sm"
        >
          <span>Go to My Profile</span>
        </Link>
        <button
          onClick={logout}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)]"
        >
          Sign out
        </button>
      </GateMessage>
    );
  }

  const isOwnerOnlyRoute = ADMIN_ONLY_ROUTES.some((r) => pathname === r || pathname?.startsWith(`${r}/`));
  if (isOwnerOnlyRoute && !isAdmin) {
    return (
      <GateMessage title="Owner Only" message="Only the salon owner or an administrator can open this page.">
        <Link
          href="/admin/dashboard"
          className="w-full btn-primary py-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-sm"
        >
          <span>Back to Dashboard</span>
        </Link>
      </GateMessage>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Sidebar */}
      <div className="contents print:hidden">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="contents print:hidden">
          <Navbar />
        </div>
        <main className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 flex-1 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      <div className="contents print:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
