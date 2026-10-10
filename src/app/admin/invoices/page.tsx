'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { apiRequest, generateIdempotencyKey } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import { KPICard } from '@/components/ui/KPICard';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_TENANT_ID } from '@/lib/api/config';
import { Banknote, CheckCircle2, Clock, RefreshCw, RotateCcw, Wallet } from 'lucide-react';
import { formatMoney, toNumber, toList, todayISO, wallClockDate } from '@/lib/format';

// A bill, in shop terms. Bills are created automatically when an appointment is marked Done.
interface Bill {
  invoiceId: string;
  customerId: string;
  customerName: string;
  what: string;
  date: string;
  total: number;
  balanceDue: number;
  status: string;
  bookingIds: string[];
  payment?: Payment;
}

interface Payment {
  paymentId: string;
  invoiceId: string | null;
  amount: number;
  refundedAmount: number;
  date: string;
  status: string;
}

function prettyDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PaymentsPage() {
  const { showSuccess, showError } = useToast();

  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<'unpaid' | 'paid'>('unpaid');

  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const [refundBill, setRefundBill] = useState<Bill | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [custRes, invRes, payRes] = await Promise.all([
        apiRequest<any>(`/api/v1/tenants/${DEFAULT_TENANT_ID}/customers`).catch(() => []),
        apiRequest<any>('/api/v1/billing/invoices'),
        apiRequest<any>('/api/v1/payments').catch(() => []),
      ]);

      const names = new Map<string, string>();
      for (const c of toList<any>(custRes, 'customers')) {
        const cust = c?.customer || c;
        const id = cust?.customerId || c?.customerId;
        if (id) names.set(id, cust.fullName || cust.name || 'Customer');
      }

      const paymentByInvoice = new Map<string, Payment>();
      for (const p of toList<any>(payRes, 'payments')) {
        if (!p?.invoiceId) continue;
        paymentByInvoice.set(p.invoiceId, {
          paymentId: p.paymentId,
          invoiceId: p.invoiceId,
          amount: toNumber(p.amount),
          refundedAmount: toNumber(p.refundedAmount),
          date: wallClockDate(p.paymentDate || p.createdAt),
          status: p.status,
        });
      }

      setBills(
        toList<any>(invRes, 'invoices')
          .filter((inv) => inv && !['VOID', 'CANCELLED'].includes(inv.status))
          .map((inv) => {
            const items: any[] = inv.items || [];
            const what =
              items
                .filter((it) => !/tax/i.test(String(it.itemType)))
                .map((it) => it.description)
                .filter(Boolean)
                .join(', ') || 'Service';
            return {
              invoiceId: inv.invoiceId,
              customerId: inv.customerId,
              customerName: names.get(inv.customerId) || 'Customer',
              what,
              date: wallClockDate(inv.issueDate || inv.createdAt),
              total: toNumber(inv.total),
              balanceDue: toNumber(inv.balanceDue),
              status: inv.status,
              bookingIds: [...new Set(items.map((it) => it.bookingId).filter(Boolean))] as string[],
              payment: paymentByInvoice.get(inv.invoiceId),
            };
          })
          .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      );
    } catch (err: any) {
      setBills([]);
      setLoadError(err.message || 'Could not load payments.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const unpaid = useMemo(() => bills.filter((b) => b.balanceDue > 0.009), [bills]);
  const paid = useMemo(() => bills.filter((b) => b.balanceDue <= 0.009), [bills]);
  const owed = unpaid.reduce((sum, b) => sum + b.balanceDue, 0);
  const today = todayISO();
  const collectedToday = paid
    .filter((b) => b.payment?.date === today)
    .reduce((sum, b) => sum + (b.payment ? b.payment.amount - b.payment.refundedAmount : 0), 0);

  const handleCashReceived = async () => {
    if (!payingBill) return;
    setIsPaying(true);
    try {
      await apiRequest('/api/v1/payments', {
        method: 'POST',
        body: JSON.stringify({
          customerId: payingBill.customerId,
          invoiceId: payingBill.invoiceId,
          amount: payingBill.balanceDue,
          currency: 'CAD',
          paymentMethod: 'CASH',
          paymentDate: todayISO(),
          notes: `${payingBill.what} — ${payingBill.customerName}`,
          idempotencyKey: generateIdempotencyKey(),
        }),
      });
      // The backend completes an appointment only once its bill is paid.
      for (const bookingId of payingBill.bookingIds) {
        await apiRequest(`/api/v1/bookings/${bookingId}/complete`, { method: 'POST', body: '{}' }).catch(() => {
          /* already completed */
        });
      }
      showSuccess('Payment Recorded', `$${formatMoney(payingBill.balanceDue)} cash from ${payingBill.customerName}.`);
      setPayingBill(null);
      loadData();
    } catch (err: any) {
      showError('Payment Failed', err.message || 'Could not record the payment.');
    } finally {
      setIsPaying(false);
    }
  };

  const openRefund = (bill: Bill) => {
    if (!bill.payment) return;
    setRefundBill(bill);
    setRefundAmount(formatMoney(bill.payment.amount - bill.payment.refundedAmount));
    setRefundReason('');
  };

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    const payment = refundBill?.payment;
    if (!refundBill || !payment) return;
    const amount = toNumber(refundAmount);
    if (!(amount > 0)) {
      showError('Amount Required', 'Enter how much cash you gave back.');
      return;
    }
    setIsRefunding(true);
    try {
      await apiRequest(`/api/v1/payments/${payment.paymentId}/refund`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          reason: refundReason.trim() || undefined,
          idempotencyKey: generateIdempotencyKey(),
        }),
      });
      showSuccess('Refund Recorded', `$${formatMoney(amount)} returned to ${refundBill.customerName}.`);
      setRefundBill(null);
      loadData();
    } catch (err: any) {
      showError('Refund Failed', err.message || 'Could not record the refund.');
    } finally {
      setIsRefunding(false);
    }
  };

  const visible = tab === 'unpaid' ? unpaid : paid;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Payments</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            A bill is created automatically when you mark an appointment <strong>Done</strong>. Collect the cash here
            or right from the appointment.
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)] self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KPICard
          label="Waiting to be paid"
          value={`$${formatMoney(owed)}`}
          sub={`${unpaid.length} unpaid ${unpaid.length === 1 ? 'bill' : 'bills'}`}
          icon={Clock}
          accentColor="text-amber-600"
          iconBgColor="bg-amber-50 dark:bg-amber-950/40"
        />
        <KPICard
          label="Collected today"
          value={`$${formatMoney(collectedToday)}`}
          sub="Cash from finished appointments"
          icon={Wallet}
          accentColor="text-emerald-600"
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/40"
        />
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
        <div className="p-3 border-b border-[var(--border)] flex gap-1 text-xs font-bold">
          {(
            [
              ['unpaid', `Unpaid (${unpaid.length})`],
              ['paid', `Paid (${paid.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                tab === key
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">Loading...</div>
        ) : loadError ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-xs font-bold text-rose-600">{loadError}</p>
            <button onClick={loadData} className="btn-primary px-4 py-2 rounded-xl text-xs font-bold">
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-60" />
            <h3 className="text-sm font-bold text-[var(--foreground)]">
              {tab === 'unpaid' ? 'Nothing waiting to be paid' : 'No payments yet'}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              {tab === 'unpaid' ? (
                <>
                  Bills appear here when an appointment is marked Done in{' '}
                  <Link href="/admin/appointments" className="font-bold text-[var(--primary)] hover:underline">
                    Appointments
                  </Link>
                  .
                </>
              ) : (
                'Paid bills will show up here.'
              )}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {visible.map((bill) => (
              <div key={bill.invoiceId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-[var(--foreground)]">{bill.customerName}</p>
                  <p className="text-xs font-bold text-[var(--primary)] truncate">{bill.what}</p>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                    {tab === 'paid' && bill.payment
                      ? `Paid in cash · ${prettyDate(bill.payment.date)}`
                      : `Done · ${prettyDate(bill.date)}`}
                    {bill.payment && bill.payment.refundedAmount > 0 && (
                      <span className="text-rose-600"> · ${formatMoney(bill.payment.refundedAmount)} refunded</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <span className="text-lg font-black text-[var(--foreground)]">
                    ${formatMoney(tab === 'unpaid' ? bill.balanceDue : bill.total)}
                  </span>
                  {tab === 'unpaid' ? (
                    <button
                      onClick={() => setPayingBill(bill)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                    >
                      <Banknote className="w-4 h-4" />
                      Cash received
                    </button>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Paid</span>
                      {bill.payment && bill.payment.amount - bill.payment.refundedAmount > 0.009 && (
                        <button
                          onClick={() => openRefund(bill)}
                          className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Give money back"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-[var(--muted-foreground)]">
        Selling something without an appointment, like a product? Record it in the{' '}
        <Link href="/admin/accounting" className="font-bold text-[var(--primary)] hover:underline">
          Money Book
        </Link>{' '}
        as Money In.
      </p>

      {/* Cash received */}
      <Modal isOpen={!!payingBill} onClose={() => setPayingBill(null)} title="Cash received" maxWidth="sm">
        {payingBill && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[var(--muted)] space-y-1">
              <p className="text-xs font-bold text-[var(--foreground)]">{payingBill.customerName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{payingBill.what}</p>
              <p className="text-2xl font-black text-[var(--foreground)] pt-2">
                ${formatMoney(payingBill.balanceDue)}{' '}
                <span className="text-xs font-bold text-[var(--muted-foreground)]">CAD</span>
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setPayingBill(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCashReceived}
                disabled={isPaying}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              >
                {isPaying ? 'Recording...' : 'Confirm cash received'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Refund */}
      <Modal isOpen={!!refundBill} onClose={() => setRefundBill(null)} title="Give money back" maxWidth="sm">
        {refundBill && (
          <form onSubmit={handleRefund} className="space-y-4">
            <p className="text-xs text-[var(--muted-foreground)]">
              {refundBill.customerName} · {refundBill.what}
            </p>
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Amount returned (CAD $)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-sm font-bold text-[var(--foreground)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Reason (optional)</label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Customer wasn't happy with the cut"
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setRefundBill(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRefunding}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
              >
                {isRefunding ? 'Recording...' : 'Record refund'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
