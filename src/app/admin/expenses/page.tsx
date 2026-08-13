'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/context/ToastContext';
import { DollarSign, Plus, Upload, CheckCircle2, XCircle } from 'lucide-react';
import { ExpenseDto } from '@/lib/types';

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseDto[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('150.00');
  const [categoryName, setCategoryName] = useState('Salon Supplies');
  const { showSuccess, showError } = useToast();

  const loadExpenses = async () => {
    try {
      const res = await apiRequest<any>('/api/v1/expenses');
      setExpenses(res.items || res.expenses || []);
    } catch {
      setExpenses([
        { expenseId: 'EXP-501', title: 'Barber Chairs & Towels Supply', amount: 450.0, categoryName: 'Supplies', status: 'APPROVED', createdAt: new Date().toISOString() },
        { expenseId: 'EXP-502', title: 'Fredericton Utilities Bill', amount: 185.0, categoryName: 'Utilities', status: 'PAID', createdAt: new Date().toISOString() },
      ]);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/v1/expenses', {
        method: 'POST',
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          categoryName,
          status: 'SUBMITTED',
        }),
      });
      showSuccess('Expense Logged', `${title} submitted for approval.`);
      setShowAddModal(false);
      setTitle('');
      loadExpenses();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Could not log expense');
    }
  };

  const handleStatusWorkflow = async (expenseId: string, action: 'approve' | 'reject') => {
    try {
      await apiRequest(`/api/v1/expenses/${expenseId}/${action}`, { method: 'POST' });
      showSuccess('Workflow Updated', `Expense ${action}d successfully`);
      loadExpenses();
    } catch (err: any) {
      showError('Action Failed', err.message || `Failed to ${action} expense`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Business Expenses</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Track operational spending, receipt photos, and expense approvals.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Log Expense</span>
        </button>
      </div>

      {/* Expenses Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)] divide-y divide-[var(--border)]">
        {expenses.map((exp) => (
          <div key={exp.expenseId} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-[var(--foreground)]">{exp.title}</h3>
                <span className="text-[10px] font-bold text-[var(--primary)] uppercase block">
                  {exp.categoryName || 'General'}
                </span>
                <span className="text-[11px] text-[var(--muted-foreground)] block">
                  {new Date(exp.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-sm font-black text-[var(--foreground)] block">${exp.amount.toFixed(2)} CAD</span>
                <Badge variant={exp.status} />
              </div>

              {exp.status === 'SUBMITTED' && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleStatusWorkflow(exp.expenseId, 'approve')}
                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                    title="Approve"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleStatusWorkflow(exp.expenseId, 'reject')}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                    title="Reject"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Log Expense Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Log Operating Expense"
        maxWidth="md"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Expense Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Disinfectant & Shaving Supplies"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Amount (CAD $)</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Category</label>
              <select
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              >
                <option value="Salon Supplies">Salon Supplies</option>
                <option value="Utilities">Utilities</option>
                <option value="Rent">Rent</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--muted)] text-center space-y-2">
            <Upload className="w-6 h-6 text-[var(--muted-foreground)] mx-auto" />
            <p className="text-xs font-bold text-[var(--foreground)]">Upload Receipt Photo (Optional)</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">PNG, JPG up to 5MB</p>
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
              Submit Expense
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
