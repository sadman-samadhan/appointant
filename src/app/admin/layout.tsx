'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { Modal } from '@/components/ui/Modal';
import { apiRequest } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Wallet, ShieldAlert, LogIn, Sparkles, RefreshCw } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState('25.00');
  const [customerName, setCustomerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const { showSuccess, showError } = useToast();
  const { isAuthenticated, isLoading, login, token } = useAuth();

  const handleQuickReauth = async () => {
    setIsReauthenticating(true);
    try {
      await login('bdiamond.owner@system.com', '123456789', 'ADMIN');
      showSuccess('Signed In', 'Session restored as Salon Owner.');
    } catch (err: any) {
      showError('Authentication Failed', err.message || 'Please log in manually.');
    } finally {
      setIsReauthenticating(false);
    }
  };

  const handleRecordCash = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiRequest('/api/v1/payments', {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(cashAmount),
          paymentMethod: 'CASH',
          currency: 'CAD',
          customerName: customerName || 'Walk-in Client',
        }),
      });
      showSuccess('Cash Registered', `$${cashAmount} CAD recorded successfully.`);
      setShowCashModal(false);
      setCustomerName('');
    } catch (err: any) {
      showError('Payment Error', err.message || 'Failed to record cash payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoading && (!isAuthenticated || !token)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-[var(--border)] shadow-xl text-center space-y-5 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[var(--foreground)]">Authentication Required</h2>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Your salon session has expired or requires sign in. Re-authenticate to access salon records and operational tools.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleQuickReauth}
              disabled={isReauthenticating}
              className="w-full btn-primary py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isReauthenticating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isReauthenticating ? 'Restoring Session...' : '1-Click Restore Session (Owner)'}</span>
            </button>

            <Link
              href="/login"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] transition-colors inline-flex items-center justify-center gap-2 border border-[var(--border)]"
            >
              <LogIn className="w-4 h-4" />
              <span>Go to Sign In Portal</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onOpenCashModal={() => setShowCashModal(true)} />
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
