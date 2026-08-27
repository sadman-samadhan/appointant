'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID } from '@/lib/api/config';
import {
  DollarSign,
  Plus,
  Upload,
  CheckCircle2,
  XCircle,
  FolderPlus,
  RefreshCw,
  Trash2,
  CreditCard,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ExpenseDto, ExpenseCategoryDto, AccountDto, StaffResponseDto } from '@/lib/types';

export default function AdminExpensesPage() {
  const { showSuccess, showError } = useToast();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'expenses' | 'categories'>('expenses');
  const [expenses, setExpenses] = useState<ExpenseDto[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryDto[]>([]);
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [staffList, setStaffList] = useState<StaffResponseDto[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Log Expense Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('150.00');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'COMPANY_CARD' | 'BANK_TRANSFER' | 'PERSONAL_CARD'>('CASH');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // Add Category Modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryAccountId, setCategoryAccountId] = useState('');
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  // Reject Reason Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseDto | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Expense receipt missing or unapproved amount');
  const [isRejecting, setIsRejecting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);

    try {
      const catRes = await apiRequest<any>('/api/v1/expenses/categories');
      const cList: ExpenseCategoryDto[] = catRes.items || catRes.categories || catRes || [];
      if (Array.isArray(cList)) {
        setCategories(
          cList.map((c: any) => ({
            categoryId: c.categoryId || c.id,
            categoryName: c.categoryName || c.name,
            name: c.name || c.categoryName,
            description: c.description,
            accountId: c.accountId,
          }))
        );
        if (cList.length > 0) {
          const firstCat = cList[0] as any;
          setCategoryId(firstCat.categoryId || firstCat.id || '');
        }
      }
    } catch {
      setCategories([]);
    }

    try {
      const expRes = await apiRequest<any>('/api/v1/expenses');
      const eList: ExpenseDto[] = expRes.items || expRes.expenses || expRes || [];
      if (Array.isArray(eList)) {
        setExpenses(
          eList.map((e: any) => {
            const matchedCat = categories.find((c) => c.categoryId === e.categoryId);
            return {
              expenseId: e.expenseId || e.id,
              description: e.description || e.title,
              title: e.description || e.title,
              amount: Number(e.amount || 0),
              currency: e.currency || 'CAD',
              categoryName: e.categoryName || e.category?.name || matchedCat?.categoryName || 'General Operating',
              categoryId: e.categoryId,
              paymentMethod: e.paymentMethod || 'CASH',
              status: e.status || 'SUBMITTED',
              receiptNumber: e.receiptNumber,
              notes: e.notes,
              createdAt: e.createdAt || e.expenseDate || new Date().toISOString(),
            };
          })
        );
      }
    } catch {
      setExpenses([]);
    }

    try {
      const stfRes = await apiRequest<any>(`/api/v1/staff?tenantId=${DEFAULT_TENANT_ID}`);
      const sList = stfRes.items || stfRes.staff || stfRes.data || (Array.isArray(stfRes) ? stfRes : []);
      if (Array.isArray(sList) && sList.length > 0) {
        const validStaff = sList
          .filter((s: any) => s.staffId !== 'c3e2cead-5ad3-41f8-83c2-26c85bbd0648' && s.id !== 'c3e2cead-5ad3-41f8-83c2-26c85bbd0648')
          .filter((s: any) => !s.tenantId || s.tenantId === DEFAULT_TENANT_ID);
        const effectiveList = validStaff.length > 0 ? validStaff : sList;

        const normalized: StaffResponseDto[] = effectiveList.map((s: any) => ({
          staffId: s.staffId || s.id,
          fullName: s.fullName || s.name || 'Specialist',
          email: s.email,
          phone: s.phone,
          roleTitle: s.roleTitle || s.role || 'Barber Specialist',
          employmentType: s.employmentType || 'FULL_TIME',
          status: s.status || 'ACTIVE',
        }));
        setStaffList(normalized);
        if (normalized.length > 0) {
          setSelectedStaffId(normalized[0].staffId);
        }
      }
    } catch {
      setStaffList([]);
    }

    try {
      const accRes = await apiRequest<any>('/api/v1/accounting/accounts');
      const aList = accRes.items || accRes.accounts || accRes || [];
      if (Array.isArray(aList)) setAccounts(aList);
    } catch {
      setAccounts([]);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [loadData, isAdmin]);

  // Create Expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      showError('Category Missing', 'Please create an expense category first.');
      return;
    }

    let finalStaffId = selectedStaffId;
    if (!finalStaffId && staffList.length > 0) {
      finalStaffId = staffList[0].staffId;
    }
    if (!finalStaffId) {
      showError('Staff Required', 'Please register at least one specialist or staff member first.');
      return;
    }

    setIsSubmittingExpense(true);
    try {
      await apiRequest('/api/v1/expenses', {
        method: 'POST',
        body: JSON.stringify({
          staffId: finalStaffId,
          categoryId,
          description: description.trim(),
          amount: parseFloat(amount),
          currency: 'CAD',
          expenseDate,
          paymentMethod,
          receiptNumber: receiptNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      showSuccess('Expense Logged', `${description} submitted for approval.`);
      setShowAddModal(false);
      setDescription('');
      loadData();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Could not log expense');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCat(true);
    try {
      await apiRequest('/api/v1/expenses/categories', {
        method: 'POST',
        body: JSON.stringify({
          categoryName: categoryName.trim(),
          description: categoryDescription.trim(),
          accountId: categoryAccountId || undefined,
          requiresReceipt: true,
        }),
      });
      showSuccess('Category Created', `${categoryName} added to expense categories.`);
      setShowCatModal(false);
      setCategoryName('');
      setCategoryDescription('');
      loadData();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Could not create category');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  // Workflow Approvals
  const handleApproveExpense = async (expenseId: string) => {
    try {
      await apiRequest(`/api/v1/expenses/${expenseId}/approve`, { method: 'POST' });
      showSuccess('Expense Approved', 'Expense approved for payment.');
      loadData();
    } catch (err: any) {
      showError('Approval Failed', err.message || 'Could not approve expense');
    }
  };

  const handlePayExpense = async (expenseId: string) => {
    try {
      await apiRequest(`/api/v1/expenses/${expenseId}/process-payment`, { method: 'POST' });
      showSuccess('Expense Paid', 'Expense marked as PAID and settled.');
      loadData();
    } catch (err: any) {
      showError('Payment Failed', err.message || 'Could not pay expense');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    setIsRejecting(true);
    try {
      await apiRequest(`/api/v1/expenses/${selectedExpense.expenseId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectionReason }),
      });
      showSuccess('Expense Rejected', 'Expense marked as REJECTED.');
      setShowRejectModal(false);
      setSelectedExpense(null);
      loadData();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Could not reject expense');
    } finally {
      setIsRejecting(false);
    }
  };

  const openAddExpenseModal = async () => {
    setShowAddModal(true);
    if (staffList.length === 0) {
      try {
        const stfRes = await apiRequest<any>(`/api/v1/staff?tenantId=${DEFAULT_TENANT_ID}`);
        const sList = stfRes.items || stfRes.staff || stfRes.data || (Array.isArray(stfRes) ? stfRes : []);
        if (Array.isArray(sList) && sList.length > 0) {
          const validStaff = sList
            .filter((s: any) => s.staffId !== 'c3e2cead-5ad3-41f8-83c2-26c85bbd0648' && s.id !== 'c3e2cead-5ad3-41f8-83c2-26c85bbd0648')
            .filter((s: any) => !s.tenantId || s.tenantId === DEFAULT_TENANT_ID);
          const effectiveList = validStaff.length > 0 ? validStaff : sList;

          const normalized: StaffResponseDto[] = effectiveList.map((s: any) => ({
            staffId: s.staffId || s.id,
            fullName: s.fullName || s.name || 'Specialist',
            email: s.email,
            phone: s.phone,
            roleTitle: s.roleTitle || s.role || 'Barber Specialist',
            employmentType: s.employmentType || 'FULL_TIME',
            status: s.status || 'ACTIVE',
          }));
          setStaffList(normalized);
          if (normalized.length > 0) {
            setSelectedStaffId(normalized[0].staffId);
          }
        }
      } catch {
        /* empty */
      }
    }
  };

  if (!isAuthLoading && !isAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 pt-16 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 flex items-center justify-center mx-auto border border-amber-200">
          <DollarSign className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-[var(--foreground)]">Administrator Access Required</h2>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          Operating expenses, accounting budgets, and expense approval workflows are restricted to Salon Owners and Administrators.
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
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Business Operating Expenses</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Track operational salon spending, receipt documentation, and expense approval workflows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)]"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCatModal(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)] flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4 text-[var(--primary)]" />
            <span>New Category</span>
          </button>
          <button
            onClick={openAddExpenseModal}
            className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'expenses'
              ? 'bg-[var(--primary)] text-white shadow-sm font-black'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Expenses Ledger ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'categories'
              ? 'bg-[var(--primary)] text-white shadow-sm font-black'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Expense Categories ({categories.length})
        </button>
      </div>

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">Loading expenses...</div>
          ) : expenses.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <DollarSign className="w-10 h-10 text-[var(--muted-foreground)] mx-auto opacity-40" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">No operational expenses logged</h3>
              <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
                Log utilities, salon supplies, marketing, or rent expenses to track disbursements.
              </p>
              <button
                onClick={openAddExpenseModal}
                className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Log First Expense</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {expenses.map((exp) => (
                <div key={exp.expenseId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-[var(--foreground)]">{exp.description}</h3>
                      <span className="text-[10px] font-bold text-[var(--primary)] uppercase block">
                        {exp.categoryName || 'General'} · {exp.paymentMethod || 'CASH'}
                      </span>
                      <span className="text-[11px] text-[var(--muted-foreground)] block">
                        {new Date(exp.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-right">
                      <span className="text-sm font-black text-[var(--foreground)] block">
                        ${exp.amount.toFixed(2)} CAD
                      </span>
                      <Badge variant={exp.status} />
                    </div>

                    {/* Workflow triggers */}
                    <div className="flex items-center gap-1">
                      {exp.status === 'SUBMITTED' && (
                        <>
                          <button
                            onClick={() => handleApproveExpense(exp.expenseId)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                            title="Approve Expense"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedExpense(exp);
                              setShowRejectModal(true);
                            }}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                            title="Reject Expense"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {exp.status === 'APPROVED' && (
                        <button
                          onClick={() => handlePayExpense(exp.expenseId)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
          {categories.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FolderPlus className="w-10 h-10 text-[var(--muted-foreground)] mx-auto opacity-40" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">No expense categories created</h3>
              <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
                Create categories (Supplies, Rent, Utilities, Marketing) to categorize expenses.
              </p>
              <button
                onClick={() => setShowCatModal(true)}
                className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Category</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {categories.map((cat) => (
                <div key={cat.categoryId} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-black text-[var(--foreground)]">{cat.name || cat.categoryName}</h3>
                    {cat.description && (
                      <p className="text-[11px] text-[var(--muted-foreground)]">{cat.description}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--primary)]">
                    Active Category
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Log Expense Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Log Operating Expense"
        maxWidth="md"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Expense Description</label>
              <input
                type="text"
                required
                placeholder="e.g. Barber Chairs Disinfectant & Towels"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Staff Submitter</label>
              {staffList.length === 0 ? (
                <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-[11px] font-semibold text-amber-800 dark:text-amber-300 border border-amber-200">
                  No staff found. Please add a specialist first.
                </div>
              ) : (
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
                >
                  {staffList.map((stf) => (
                    <option key={stf.staffId} value={stf.staffId}>
                      {stf.fullName} ({stf.roleTitle || 'Specialist'})
                    </option>
                  ))}
                </select>
              )}
            </div>
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
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              >
                {categories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.name || c.categoryName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              >
                <option value="CASH">CASH</option>
                <option value="COMPANY_CARD">COMPANY CARD</option>
                <option value="BANK_TRANSFER">BANK TRANSFER</option>
                <option value="PERSONAL_CARD">PERSONAL CARD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Expense Date</label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Receipt / Invoice Ref #</label>
              <input
                type="text"
                placeholder="e.g. RCPT-4402"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Notes</label>
              <input
                type="text"
                placeholder="Additional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)]"
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
            <button
              type="submit"
              disabled={isSubmittingExpense}
              className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingExpense ? 'Submitting...' : 'Submit Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Category Modal */}
      <Modal
        isOpen={showCatModal}
        onClose={() => setShowCatModal(false)}
        title="Create Expense Category"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Category Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Salon Equipment & Supplies"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Shaving cream, oils, disinfectant"
              value={categoryDescription}
              onChange={(e) => setCategoryDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Linked GL Account (Optional)</label>
            <select
              value={categoryAccountId}
              onChange={(e) => setCategoryAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
            >
              <option value="">None / Auto Assign</option>
              {accounts.map((a) => (
                <option key={a.accountId} value={a.accountId}>
                  {a.accountCode} - {a.accountName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowCatModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingCat}
              className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingCat ? 'Creating...' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reject Modal */}
      {selectedExpense && (
        <Modal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title="Reject Expense"
          maxWidth="sm"
        >
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1">Rejection Reason</label>
              <input
                type="text"
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRejecting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isRejecting ? 'Rejecting...' : 'Reject Expense'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
