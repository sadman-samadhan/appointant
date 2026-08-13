'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { Modal } from '@/components/ui/Modal';
import { apiRequest } from '@/lib/api/client';
import { useToast } from '@/context/ToastContext';
import { Wallet } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState('25.00');
  const [customerName, setCustomerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

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
