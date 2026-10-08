'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar, ADMIN_ONLY_ROUTES } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { addEntry } from '@/lib/moneyBook';
import { formatMoney, todayISO } from '@/lib/format';
import { Wallet, ShieldAlert, LogIn, RefreshCw } from 'lucide-react';

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
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState('25.00');
  const [customerName, setCustomerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();
  const { isAuthenticated, isLoading, isAdmin, isStaff, logout } = useAuth();

  // Records walk-in cash straight into the Money Book as "Money In".
  const handleRecordCash = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addEntry({
        type: 'IN',
        amount: parseFloat(cashAmount),
        date: todayISO(),
        category: 'Services',
        note: customerName.trim() || 'Walk-in client',
        paidWith: 'CASH',
      });
      showSuccess('Cash Recorded', `$${formatMoney(cashAmount)} CAD added to the Money Book.`);
      setShowCashModal(false);
      setCustomerName('');
    } catch (err: any) {
      showError('Payment Error', err.message || 'Failed to record cash payment');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onOpenCashModal={isAdmin ? () => setShowCashModal(true) : undefined} />
        <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      {/* Global Quick Cash Register Modal */}
      <Modal
        isOpen={showCashModal}
        onClose={() => setShowCashModal(false)}
        title="Record Cash Payment"
        maxWidth="sm"
      >
        <form onSubmit={handleRecordCash} className="space-y-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Wallet className="w-4 h-4 shrink-0" />
            <span>Enforcing Phase 1 Cash-Only In-Person Payment</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              Payment Amount (CAD $)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-sm font-bold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              Customer Name / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Walk-in Haircut"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-medium text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowCashModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Cash Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
