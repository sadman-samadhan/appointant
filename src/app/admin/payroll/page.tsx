'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_TENANT_ID } from '@/lib/api/config';
import {
  Briefcase,
  Plus,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  DollarSign,
  Calendar,
  CreditCard,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { PayrollDto, StaffResponseDto, AccountDto } from '@/lib/types';

export default function AdminPayrollPage() {
  const { showSuccess, showError } = useToast();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();

  const [payrollList, setPayrollList] = useState<PayrollDto[]>([]);
  const [staffList, setStaffList] = useState<StaffResponseDto[]>([]);
  const [cashAccounts, setCashAccounts] = useState<AccountDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate Payroll Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [periodStart, setPeriodStart] = useState('2026-08-01');
  const [periodEnd, setPeriodEnd] = useState('2026-08-15');
  const [baseSalary, setBaseSalary] = useState('1200.00');
  const [bonus, setBonus] = useState('350.00');
  const [deductions, setDeductions] = useState('0.00');
  const [notes, setNotes] = useState('Bi-weekly staff salary & commission');
  const [isSubmittingPayroll, setIsSubmittingPayroll] = useState(false);

  // Pay Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPayrollToPay, setSelectedPayrollToPay] = useState<PayrollDto | null>(null);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    let loadedStaff: StaffResponseDto[] = [];

    try {
      const stfRes = await apiRequest<any>(`/api/v1/staff?tenantId=${DEFAULT_TENANT_ID}`);
      const sList = stfRes.items || stfRes.staff || stfRes.data || (Array.isArray(stfRes) ? stfRes : []);
      if (Array.isArray(sList) && sList.length > 0) {
        const validStaff = sList
          .filter((s: any) => s.staffId !== 'c3e2cead-5ad3-41f8-83c2-26c85bbd0648' && s.id !== 'c3e2cead-5ad3-41f8-83c2-26c85bbd0648')
          .filter((s: any) => !s.tenantId || s.tenantId === DEFAULT_TENANT_ID);
        const effectiveList = validStaff.length > 0 ? validStaff : sList;

        loadedStaff = effectiveList.map((s: any) => ({
          staffId: s.staffId || s.id,
          fullName: s.fullName || s.name || 'Specialist',
          email: s.email,
          phone: s.phone,
          roleTitle: s.roleTitle || s.role || 'Specialist',
          employmentType: s.employmentType || 'FULL_TIME',
          status: s.status || 'ACTIVE',
        }));
        setStaffList(loadedStaff);
        if (loadedStaff.length > 0) {
          setSelectedStaffId((prev) => prev || loadedStaff[0].staffId);
        }
      }
    } catch {
      setStaffList([]);
    }

    try {
      const accRes = await apiRequest<any>('/api/v1/accounting/accounts');
      const aList: AccountDto[] = accRes.items || accRes.accounts || accRes || [];
      if (Array.isArray(aList)) {
        const cashOnly = aList.filter((a: any) => a.accountType === 'ASSET' || true);
        setCashAccounts(cashOnly);
        if (cashOnly.length > 0) {
          setPaymentAccountId((prev) => prev || cashOnly[0].accountId);
        }
      }
    } catch {
      setCashAccounts([]);
    }

    try {
      const res = await apiRequest<any>('/api/v1/payroll');
      const list: PayrollDto[] = res.items || res.payroll || res || [];
      if (Array.isArray(list)) {
        setPayrollList(
          list.map((p: any) => {
            const matchedStaff = loadedStaff.find((s: any) => s.staffId === p.staffId);
            return {
              payrollId: p.payrollId || p.id,
              staffId: p.staffId,
              staffName: p.staffName || p.staff?.fullName || matchedStaff?.fullName || (matchedStaff as any)?.name || 'Specialist',
              periodStart: p.periodStart || '2026-08-01',
              periodEnd: p.periodEnd || '2026-08-15',
              baseSalary: Number(p.baseSalary || 0),
              bonus: Number(p.bonus || p.commission || 0),
              commission: Number(p.commission || p.bonus || 0),
              deductions: Number(p.deductions || 0),
              totalAmount: Number(p.totalAmount ?? (Number(p.baseSalary || 0) + Number(p.bonus || 0) - Number(p.deductions || 0))),
              status: p.status || 'DRAFT',
              notes: p.notes,
            };
          })
        );
      }
    } catch {
      setPayrollList([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [loadData, isAdmin]);

  // Create Payroll Draft
  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      showError('Staff Required', 'Please register a specialist first.');
      return;
    }
    setIsSubmittingPayroll(true);
    try {
      await apiRequest('/api/v1/payroll', {
        method: 'POST',
        body: JSON.stringify({
          staffId: selectedStaffId,
          periodStart,
          periodEnd,
          baseSalary: parseFloat(baseSalary),
          bonus: parseFloat(bonus) || 0,
          deductions: parseFloat(deductions) || 0,
          notes: notes.trim() || undefined,
        }),
      });

      showSuccess('Payroll Calculated', 'Draft payroll record posted.');
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Could not generate payroll');
    } finally {
      setIsSubmittingPayroll(false);
    }
  };

  // Pay Payroll Action
  const handlePayPayrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayrollToPay) return;
    setIsPaying(true);
    try {
      await apiRequest(`/api/v1/payroll/${selectedPayrollToPay.payrollId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paymentAccountId: paymentAccountId || 'c36e10f1-fb01-456f-847a-375a10d75019' }),
      });
      showSuccess('Payout Executed', `Payment posted for ${selectedPayrollToPay.staffName}`);
      setShowPayModal(false);
      setSelectedPayrollToPay(null);
      loadData();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Failed to execute payroll payout');
    } finally {
      setIsPaying(false);
    }
  };

  // Reverse Payroll
  const handleReversePayroll = async (payrollId: string) => {
    if (!confirm('Reverse this payroll payment?')) return;
    try {
      await apiRequest(`/api/v1/payroll/${payrollId}/reverse`, {
        method: 'POST',
      });
      showSuccess('Payroll Reversed', 'Payroll transaction reversed.');
      loadData();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Could not reverse payroll');
    }
  };

  // Delete Draft Payroll
  const handleDeletePayroll = async (payrollId: string) => {
    if (!confirm('Delete this draft payroll?')) return;
    try {
      await apiRequest(`/api/v1/payroll/${payrollId}`, { method: 'DELETE' });
      showSuccess('Payroll Deleted', 'Draft removed.');
      loadData();
    } catch (err: any) {
      showError('Delete Failed', err.message || 'Could not delete payroll');
    }
  };

  if (!isAuthLoading && !isAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 pt-16 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 flex items-center justify-center mx-auto border border-amber-200">
          <Briefcase className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-[var(--foreground)]">Administrator Access Required</h2>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          Staff payroll calculations, wage adjustments, and payout disbursements are restricted to Salon Owners and Administrators.
        </p>
        <div className="pt-2">
          <Link
            href="/admin/dashboard"
            className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Staff Payroll Records</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Base salaries, bonus/commission calculations, and cash register payroll disbursements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)]"
            title="Refresh Payroll"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Payroll</span>
          </button>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">Loading payroll records...</div>
        ) : payrollList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Briefcase className="w-10 h-10 text-[var(--muted-foreground)] mx-auto opacity-40" />
            <h3 className="text-sm font-bold text-[var(--foreground)]">No payroll records generated</h3>
            <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
              Generate payroll for specialist staff to track salary and commission disbursements.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Generate First Payroll</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {payrollList.map((pay) => (
              <div key={pay.payrollId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[var(--foreground)]">{pay.staffName}</h3>
                    <span className="text-[11px] text-[var(--muted-foreground)] block font-medium">
                      Period: {pay.periodStart} to {pay.periodEnd}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--primary)] block">
                      Base: ${pay.baseSalary.toFixed(2)} | Bonus: ${(pay.bonus || 0).toFixed(2)} | Deductions: ${(pay.deductions || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-right">
                    <span className="text-sm font-black text-[var(--foreground)] block">
                      ${pay.totalAmount.toFixed(2)} CAD
                    </span>
                    <Badge variant={pay.status} />
                  </div>

                  <div className="flex items-center gap-1">
                    {pay.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedPayrollToPay(pay);
                            setShowPayModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Execute Payout</span>
                        </button>
                        <button
                          onClick={() => handleDeletePayroll(pay.payrollId)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                          title="Delete Draft"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {pay.status === 'PAID' && (
                      <button
                        onClick={() => handleReversePayroll(pay.payrollId)}
                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50"
                        title="Reverse Payroll Payment"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Payroll Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Generate Staff Payroll Record"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePayroll} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Staff Specialist</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
            >
              {staffList.map((s) => (
                <option key={s.staffId} value={s.staffId}>
                  {s.fullName} ({s.roleTitle || 'Specialist'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Period Start</label>
              <input
                type="date"
                required
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Period End</label>
              <input
                type="date"
                required
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-[var(--foreground)] mb-1">Base Salary ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--foreground)] mb-1">Bonus/Comm ($)</label>
              <input
                type="number"
                step="0.01"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--foreground)] mb-1">Deductions ($)</label>
              <input
                type="number"
                step="0.01"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingPayroll}
              className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingPayroll ? 'Generating...' : 'Save Draft Payroll'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Pay Payroll Modal */}
      {selectedPayrollToPay && (
        <Modal
          isOpen={showPayModal}
          onClose={() => setShowPayModal(false)}
          title={`Execute Payroll Payout — ${selectedPayrollToPay.staffName}`}
          maxWidth="sm"
        >
          <form onSubmit={handlePayPayrollSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-[var(--muted)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Payout Total</span>
              <span className="text-xl font-black text-emerald-600 block">
                ${selectedPayrollToPay.totalAmount.toFixed(2)} CAD
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Disbursement Account (Cash / Bank)</label>
              <select
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
              >
                {cashAccounts.map((a) => (
                  <option key={a.accountId} value={a.accountId}>
                    {a.accountCode} - {a.accountName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPaying}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isPaying ? 'Disbursing...' : 'Confirm Cash Payout'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
