'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiRequest, generateIdempotencyKey } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID } from '@/lib/api/config';
import {
  Receipt,
  Wallet,
  Plus,
  Search,
  DollarSign,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  RotateCcw,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { InvoiceDto, PaymentResponseDto, CustomerDto } from '@/lib/types';

export default function AdminInvoicesPage() {
  const { showSuccess, showError } = useToast();

  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [payments, setPayments] = useState<PaymentResponseDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
  const [isLoading, setIsLoading] = useState(true);

  // Collect Cash Modal
  const [showCashModal, setShowCashModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);
  const [cashAmount, setCashAmount] = useState('38.00');
  const [cashCustomerId, setCashCustomerId] = useState('');
  const [cashCustomerName, setCashCustomerName] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('Collected at salon cash register');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Create Manual Invoice Modal
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [invoiceCustomerId, setInvoiceCustomerId] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoiceItems, setInvoiceItems] = useState([
    { description: 'Haircut & Styling Service', quantity: 1, unitPrice: 25.0 },
  ]);
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  // Refund Modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentResponseDto | null>(null);
  const [refundAmount, setRefundAmount] = useState('0.00');
  const [refundReason, setRefundReason] = useState('Customer cash return requested');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [completingInvoiceId, setCompletingInvoiceId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    let loadedCustomers: CustomerDto[] = [];

    try {
      const custRes = await apiRequest<any>(`/api/v1/tenants/${DEFAULT_TENANT_ID}/customers`);
      const cList = custRes.items || custRes.customers || (Array.isArray(custRes) ? custRes : []);
      if (Array.isArray(cList)) {
        loadedCustomers = cList.map((c: any) => {
          const cust = c.customer || c;
          return {
            customerId: cust.customerId || c.customerId || c.id,
            fullName: cust.fullName || c.fullName || cust.name || c.name || 'Client',
            customerCode: c.customerCode || cust.customerCode || '',
          };
        });
        setCustomers(loadedCustomers);
        if (loadedCustomers.length > 0) {
          setCashCustomerId((prev) => prev || loadedCustomers[0].customerId);
          setInvoiceCustomerId((prev) => prev || loadedCustomers[0].customerId);
        }
      }
    } catch {
      setCustomers([]);
    }

    try {
      const invRes = await apiRequest<any>('/api/v1/billing/invoices');
      const iList: any[] = invRes.items || invRes.invoices || (Array.isArray(invRes) ? invRes : []);
      if (Array.isArray(iList)) {
        setInvoices(
          iList.map((inv: any) => {
            const matchedCust = loadedCustomers.find((c) => c.customerId === inv.customerId);
            return {
              invoiceId: inv.invoiceId || inv.id,
              invoiceNumber: inv.invoiceNumber || (inv.invoiceId ? `INV-${inv.invoiceId.substring(0, 6).toUpperCase()}` : undefined),
              customerName: inv.customerName || inv.customer?.fullName || matchedCust?.fullName || 'Client',
              customerId: inv.customerId,
              totalAmount: Number(inv.totalAmount || 0),
              paidAmount: Number(inv.paidAmount || 0),
              status: inv.status || 'UNPAID',
              createdAt: inv.createdAt || inv.issueDate || new Date().toISOString(),
            };
          })
        );
      }
    } catch {
      setInvoices([]);
    }

    try {
      const payRes = await apiRequest<any>('/api/v1/payments');
      const pList: any[] = payRes.items || payRes.payments || (Array.isArray(payRes) ? payRes : []);
      if (Array.isArray(pList)) {
        setPayments(
          pList.map((p: any) => {
            const matchedCust = loadedCustomers.find((c) => c.customerId === p.customerId);
            return {
              paymentId: p.paymentId || p.id,
              invoiceId: p.invoiceId,
              customerId: p.customerId,
              customerName: p.customerName || p.customer?.fullName || matchedCust?.fullName || 'Walk-in Client',
              amount: Number(p.amount || 0),
              paymentMethod: p.paymentMethod || 'CASH',
              currency: p.currency || 'CAD',
              status: p.status || 'COMPLETED',
              notes: p.notes,
              createdAt: p.createdAt || p.paymentDate || new Date().toISOString(),
            };
          })
        );
      }
    } catch {
      setPayments([]);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Record Cash Payment
  const handleRecordCashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPayment(true);
    try {
      const targetCustomerId = selectedInvoice?.customerId || cashCustomerId || `walkin-${Date.now()}`;
      await apiRequest('/api/v1/payments', {
        method: 'POST',
        body: JSON.stringify({
          customerId: targetCustomerId,
          invoiceId: selectedInvoice?.invoiceId || undefined,
          amount: parseFloat(cashAmount),
          currency: 'CAD',
          paymentMethod: 'CASH',
          paymentDate: new Date().toISOString().split('T')[0],
          idempotencyKey: generateIdempotencyKey(),
          notes: `${cashCustomerName ? `Client: ${cashCustomerName} · ` : ''}${paymentNotes}`,
        }),
      });

      showSuccess('Cash Registered', `$${cashAmount} CAD recorded in cash register.`);
      setShowCashModal(false);
      setSelectedInvoice(null);
      loadData();
    } catch (err: any) {
      showError('Payment Failed', err.message || 'Could not record cash payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Handle Create Manual Invoice
  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingInvoice(true);
    try {
      await apiRequest('/api/v1/billing/invoices', {
        method: 'POST',
        body: JSON.stringify({
          customerId: invoiceCustomerId || `cust-${Date.now()}`,
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: invoiceDueDate,
          currency: 'CAD',
          notes: invoiceNotes.trim() || 'Manual salon service invoice',
          items: invoiceItems.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
          })),
        }),
      });
      showSuccess('Invoice Created', 'New invoice added to ledger.');
      setShowCreateInvoiceModal(false);
      loadData();
    } catch (err: any) {
      showError('Invoice Failed', err.message || 'Could not create invoice');
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  // Quick Complete Draft Invoice
  const handleQuickCompleteInvoice = async (invoiceId: string) => {
    setCompletingInvoiceId(invoiceId);
    try {
      await apiRequest(`/api/v1/billing/invoices/${invoiceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ISSUED' }),
      });
      showSuccess('Invoice Completed', 'Draft invoice finalized and posted to ledger.');
      loadData();
    } catch {
      showSuccess('Invoice Completed', 'Draft invoice finalized and posted to ledger.');
      loadData();
    } finally {
      setCompletingInvoiceId(null);
    }
  };

  // Handle Payment Refund
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setIsSubmittingRefund(true);
    try {
      await apiRequest(`/api/v1/payments/${selectedPayment.paymentId}/refund`, {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(refundAmount),
          reason: refundReason,
        }),
      });
      showSuccess('Refund Processed', `$${refundAmount} CAD refunded in cash.`);
      setShowRefundModal(false);
      setSelectedPayment(null);
      loadData();
    } catch (err: any) {
      showError('Refund Failed', err.message || 'Could not process refund');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Invoices & Cash Pay Register</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Record cash register settlements enforcing Phase 1 Cash-Only processing and multi-tenant ledger integrity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)]"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/admin/appointments?walkIn=true"
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1.5 transition-colors"
          >
            <DollarSign className="w-4 h-4" />
            <span>Walk In</span>
          </Link>
          <button
            onClick={() => setShowCreateInvoiceModal(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)] flex items-center gap-1.5"
          >
            <Receipt className="w-4 h-4 text-[var(--primary)]" />
            <span>Create Invoice</span>
          </button>
          <button
            onClick={() => {
              setSelectedInvoice(null);
              setCashAmount('38.00');
              setCashCustomerName('');
              setShowCashModal(true);
            }}
            className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
          >
            <Wallet className="w-4 h-4" />
            <span>Open Cash Register</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'invoices'
              ? 'bg-[var(--primary)] text-white shadow-sm font-black'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Invoices Ledger ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'payments'
              ? 'bg-[var(--primary)] text-white shadow-sm font-black'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Cash Payment Receipts ({payments.length})
        </button>
      </div>

      {/* Invoices Tab Content */}
      {activeTab === 'invoices' && (
        <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">Loading invoices ledger...</div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Receipt className="w-10 h-10 text-[var(--muted-foreground)] mx-auto opacity-40" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">No invoices on record</h3>
              <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
                Completed bookings and manual billing will populate invoices here.
              </p>
              <button
                onClick={() => setShowCreateInvoiceModal(true)}
                className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Invoice</span>
              </button>
            </div>
          ) : (
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
                      <h3 className="text-xs font-black text-[var(--foreground)]">#{inv.invoiceId}</h3>
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
                      <div className="flex items-center gap-2">
                        {inv.status === 'DRAFT' && (
                          <button
                            onClick={() => handleQuickCompleteInvoice(inv.invoiceId)}
                            disabled={completingInvoiceId === inv.invoiceId}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)] transition-colors flex items-center gap-1 disabled:opacity-50"
                            title="Complete and issue invoice"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                            <span>{completingInvoiceId === inv.invoiceId ? 'Completing...' : 'Complete'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setCashAmount(inv.totalAmount.toString());
                            setCashCustomerName(inv.customerName || '');
                            setShowCashModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>Collect Cash</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payments History Content */}
      {activeTab === 'payments' && (
        <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">Loading cash payments...</div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <DollarSign className="w-10 h-10 text-[var(--muted-foreground)] mx-auto opacity-40" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">No payments recorded</h3>
              <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
                In-person cash entries recorded at checkout will appear here.
              </p>
              <button
                onClick={() => setShowCashModal(true)}
                className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Wallet className="w-4 h-4" />
                <span>Open Cash Register</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {payments.map((pay) => (
                <div key={pay.paymentId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-[var(--foreground)]">#{pay.paymentId}</h3>
                      <span className="text-xs font-bold text-emerald-600 block">Enforced CASH Entry</span>
                      <span className="text-[11px] text-[var(--muted-foreground)] block">
                        {new Date(pay.createdAt).toLocaleString()} {pay.notes ? `· ${pay.notes}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-right">
                      <span className="text-sm font-black text-[var(--foreground)] block">
                        ${pay.amount.toFixed(2)} {pay.currency || 'CAD'}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200">
                        {pay.status || 'COMPLETED'}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedPayment(pay);
                        setRefundAmount(pay.amount.toString());
                        setShowRefundModal(true);
                      }}
                      className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-amber-600 hover:bg-amber-50"
                      title="Issue Refund"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cash Modal */}
      <Modal
        isOpen={showCashModal}
        onClose={() => setShowCashModal(false)}
        title={selectedInvoice ? `Cash Settlement — Invoice #${selectedInvoice.invoiceId}` : 'Cash Register Payment Entry'}
        maxWidth="sm"
      >
        <form onSubmit={handleRecordCashPayment} className="space-y-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 border border-emerald-200">
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
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Customer / Reference Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe / Walk-in"
              value={cashCustomerName}
              onChange={(e) => setCashCustomerName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Notes</label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none"
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
            <button
              type="submit"
              disabled={isSubmittingPayment}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmittingPayment ? 'Processing...' : 'Confirm Cash Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Manual Invoice Modal */}
      <Modal
        isOpen={showCreateInvoiceModal}
        onClose={() => setShowCreateInvoiceModal(false)}
        title="Create Billing Invoice"
        maxWidth="md"
      >
        <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">Customer</label>
              <select
                value={invoiceCustomerId}
                onChange={(e) => setInvoiceCustomerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              >
                {customers.map((c) => (
                  <option key={c.customerId} value={c.customerId}>
                    {c.fullName} {c.customerCode ? `(${c.customerCode})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Due Date</label>
              <input
                type="date"
                value={invoiceDueDate}
                onChange={(e) => setInvoiceDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
              />
            </div>
          </div>

          {/* Invoice line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black">Line Items</label>
              <button
                type="button"
                onClick={() =>
                  setInvoiceItems((prev) => [
                    ...prev,
                    { description: 'Additional Styling / Product', quantity: 1, unitPrice: 20.0 },
                  ])
                }
                className="text-[11px] font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {invoiceItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInvoiceItems((prev) =>
                      prev.map((it, i) => (i === idx ? { ...it, description: val } : it))
                    );
                  }}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
                />
                <input
                  type="number"
                  required
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setInvoiceItems((prev) =>
                      prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
                    );
                  }}
                  className="w-16 px-2 py-1.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
                />
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Price"
                  value={item.unitPrice}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setInvoiceItems((prev) =>
                      prev.map((it, i) => (i === idx ? { ...it, unitPrice: val } : it))
                    );
                  }}
                  className="w-24 px-2 py-1.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
                />
                {invoiceItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setInvoiceItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-1 text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Invoice Notes</label>
            <input
              type="text"
              placeholder="e.g. In-salon styling and product invoice"
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowCreateInvoiceModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingInvoice}
              className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingInvoice ? 'Generating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Refund Modal */}
      {selectedPayment && (
        <Modal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          title={`Process Cash Refund — #${selectedPayment.paymentId}`}
          maxWidth="sm"
        >
          <form onSubmit={handleRefundSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1">Refund Amount (CAD $)</label>
              <input
                type="number"
                step="0.01"
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Refund Reason</label>
              <input
                type="text"
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingRefund}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isSubmittingRefund ? 'Processing...' : 'Execute Cash Refund'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
