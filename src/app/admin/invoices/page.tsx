'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/context/ToastContext';
import { Receipt, Wallet, Plus, Search, DollarSign, CheckCircle2, ShieldCheck } from 'lucide-react';
import { InvoiceDto, PaymentResponseDto } from '@/lib/types';

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [payments, setPayments] = useState<PaymentResponseDto[]>([]);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
  const [showCashModal, setShowCashModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);

  // Cash modal state
  const [cashAmount, setCashAmount] = useState('38.00');
  const [customerName, setCustomerName] = useState('');
  const { showSuccess, showError } = useToast();

  const loadData = async () => {
    try {
      const invRes = await apiRequest<any>('/api/v1/billing/invoices');
      setInvoices(invRes.items || invRes.invoices || []);
    } catch {
      setInvoices([
        { invoiceId: 'INV-1001', customerName: 'Sarah Jenkins', totalAmount: 38.0, paidAmount: 38.0, status: 'PAID', createdAt: new Date().toISOString() },
        { invoiceId: 'INV-1002', customerName: 'Michael Vance', totalAmount: 25.0, paidAmount: 0.0, status: 'UNPAID', createdAt: new Date().toISOString() },
        { invoiceId: 'INV-1003', customerName: 'Alex Mercer', totalAmount: 40.0, paidAmount: 0.0, status: 'UNPAID', createdAt: new Date().toISOString() },
      ]);
    }

    try {
      const payRes = await apiRequest<any>('/api/v1/payments');
      setPayments(payRes.items || payRes.payments || []);
    } catch {
      setPayments([
        { paymentId: 'PAY-801', amount: 38.0, paymentMethod: 'CASH', currency: 'CAD', status: 'COMPLETED', createdAt: new Date().toISOString() },
      ]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordCashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/v1/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: selectedInvoice?.invoiceId,
          amount: parseFloat(cashAmount),
          paymentMethod: 'CASH',
          currency: 'CAD',
          customerName: customerName || selectedInvoice?.customerName || 'Walk-in Client',
        }),
      });
      showSuccess('Cash Registered', `$${cashAmount} CAD cash entry recorded.`);
      setShowCashModal(false);
      setSelectedInvoice(null);
      loadData();
    } catch (err: any) {
      showError('Payment Failed', err.message || 'Could not record cash payment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Invoices & Cash Pay Register</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Record cash register settlements enforcing Phase 1 Cash-Only processing.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedInvoice(null);
            setShowCashModal(true);
          }}
          className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm self-start"
        >
          <Wallet className="w-4 h-4" />
          <span>Open Cash Register</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'invoices'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Invoices Ledger
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'payments'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Cash Payment History
        </button>
      </div>

      {/* Invoices Tab Content */}
      {activeTab === 'invoices' && (
        <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
          <div className="divide-y divide-[var(--border)]">
            {invoices.map((inv) => (
              <div
                key={inv.invoiceId}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--muted)]/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[var(--foreground)]">{inv.invoiceId}</h3>
                    <p className="text-xs font-bold text-[var(--primary)]">{inv.customerName || 'Walk-in Client'}</p>
                    <span className="text-[11px] text-[var(--muted-foreground)] block mt-0.5">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <span className="text-sm font-black text-[var(--foreground)] block">
                      ${inv.totalAmount.toFixed(2)} CAD
                    </span>
                    <Badge variant={inv.status} />
                  </div>

                  {inv.status !== 'PAID' && (
                    <button
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setCashAmount(inv.totalAmount.toString());
                        setShowCashModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    >
                      Collect Cash
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments History Content */}
      {activeTab === 'payments' && (
        <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
          <div className="divide-y divide-[var(--border)]">
            {payments.map((pay) => (
              <div key={pay.paymentId} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[var(--foreground)]">{pay.paymentId}</h3>
                    <span className="text-xs font-bold text-emerald-600 block">Enforced CASH Entry</span>
                    <span className="text-[11px] text-[var(--muted-foreground)] block">
                      {new Date(pay.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-[var(--foreground)] block">
                    ${pay.amount.toFixed(2)} {pay.currency || 'CAD'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full">
                    {pay.status || 'COMPLETED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cash Modal */}
      <Modal
        isOpen={showCashModal}
        onClose={() => setShowCashModal(false)}
        title={selectedInvoice ? `Cash Payment for ${selectedInvoice.invoiceId}` : 'Manual Cash Entry'}
        maxWidth="sm"
      >
        <form onSubmit={handleRecordCashPayment} className="space-y-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Enforced Cash Register Payment Entry</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Cash Amount (CAD $)</label>
            <input
              type="number"
              step="0.01"
              required
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-sm font-bold text-[var(--foreground)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Customer / Reference Note</label>
            <input
              type="text"
              placeholder="Walk-in Client Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowCashModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700">
              Confirm Cash Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
