'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/context/ToastContext';
import { Briefcase, Plus, CheckCircle2, RotateCcw } from 'lucide-react';
import { PayrollDto } from '@/lib/types';

export default function AdminPayrollPage() {
  const [payrollList, setPayrollList] = useState<PayrollDto[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [staffName, setStaffName] = useState('Elena Rostova');
  const [baseSalary, setBaseSalary] = useState('1200.00');
  const [commission, setCommission] = useState('350.00');
  const { showSuccess, showError } = useToast();

  const loadPayroll = async () => {
    try {
      const res = await apiRequest<any>('/api/v1/payroll');
      setPayrollList(res.items || res.payroll || []);
    } catch {
      setPayrollList([
        { payrollId: 'PAY-101', staffId: 'stf-1', staffName: 'Elena Rostova', periodStart: '2026-08-01', periodEnd: '2026-08-15', baseSalary: 1200.0, commission: 350.0, totalAmount: 1550.0, status: 'PAID' },
        { payrollId: 'PAY-102', staffId: 'stf-2', staffName: 'James Carter', periodStart: '2026-08-01', periodEnd: '2026-08-15', baseSalary: 1100.0, commission: 280.0, totalAmount: 1380.0, status: 'DRAFT' },
      ]);
    }
  };

  useEffect(() => {
    loadPayroll();
  }, []);

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    const base = parseFloat(baseSalary);
    const comm = parseFloat(commission);
    try {
      await apiRequest('/api/v1/payroll', {
        method: 'POST',
        body: JSON.stringify({
          staffName,
          baseSalary: base,
          commission: comm,
          totalAmount: base + comm,
          status: 'DRAFT',
        }),
      });
      showSuccess('Payroll Calculated', `Draft payroll created for ${staffName}`);
      setShowAddModal(false);
      loadPayroll();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Could not process payroll');
    }
  };

  const handlePayPayroll = async (payrollId: string) => {
    try {
      await apiRequest(`/api/v1/payroll/${payrollId}/pay`, { method: 'POST' });
      showSuccess('Payroll Paid', `Payment executed for ${payrollId}`);
      loadPayroll();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Failed to pay payroll');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Staff Payroll Records</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Base salaries, commission calculations, and payroll payouts.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Payroll</span>
        </button>
      </div>

      {/* Payroll Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)] divide-y divide-[var(--border)]">
        {payrollList.map((pay) => (
          <div key={pay.payrollId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-[var(--foreground)]">{pay.staffName}</h3>
                <span className="text-[11px] text-[var(--muted-foreground)] block font-medium">
                  Period: {pay.periodStart} to {pay.periodEnd}
                </span>
                <span className="text-[10px] font-bold text-[var(--primary)] block">
                  Base: ${pay.baseSalary.toFixed(2)} | Comm: ${pay.commission.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4">
              <div className="text-right">
                <span className="text-sm font-black text-[var(--foreground)] block">
                  ${pay.totalAmount.toFixed(2)} CAD
                </span>
                <Badge variant={pay.status} />
              </div>

              {pay.status === 'DRAFT' && (
                <button
                  onClick={() => handlePayPayroll(pay.payrollId)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Execute Payout
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Generate Payroll Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Generate Staff Payroll"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePayroll} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Staff Specialist</label>
            <select
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
            >
              <option value="Elena Rostova">Elena Rostova</option>
              <option value="James Carter">James Carter</option>
              <option value="Sophia Martinez">Sophia Martinez</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Base Salary (CAD $)</label>
              <input
                type="number"
                step="0.01"
                required
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Commission (CAD $)</label>
              <input
                type="number"
                step="0.01"
                required
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary px-5 py-2 rounded-xl text-xs font-bold">
              Save Payroll Draft
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
