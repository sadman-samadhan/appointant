'use client';

// Expenses: shop bills and staff spending, with the vendor paid and the HST to claim back.
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Receipt, Plus, RefreshCw, Tags, Landmark, Check, X, Send, Wallet } from 'lucide-react';
import { apiRequest } from '@/lib/api/client';
import { toList } from '@/lib/format';
import { useT, useMoney } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import {
  Card,
  Empty,
  Field,
  Loading,
  Modal,
  PageHeader,
  Pill,
  Stat,
  dangerButton,
  errorText,
  inputClass,
  num,
  pick,
  primaryButton,
  quietButton,
} from '@/components/admin/kit';
import {
  ExpenseCategory,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  PaymentMethod,
  StaffMember,
  Vendor,
  hstIncluded,
  loadExpenseCategories,
  loadStaff,
  loadVendors,
  todayLocal,
  loadSpendCategories,
  expenseCategoryFor,
} from '@/lib/money/shopMoney';
import type { Category } from '@/lib/moneyBook';

type Status = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';

interface Expense {
  expenseId: string;
  description: string;
  amount: number;
  hstAmount: number;
  vendorId?: string;
  vendorName?: string;
  categoryId?: string;
  categoryName?: string;
  staffId?: string;
  staffName?: string;
  expenseDate: string;
  paymentMethod?: PaymentMethod;
  status: Status;
  receiptNumber?: string;
  notes?: string;
}

const STATUS_TONE: Record<Status, 'good' | 'warn' | 'bad' | 'gold' | 'plain'> = {
  DRAFT: 'plain',
  SUBMITTED: 'warn',
  APPROVED: 'gold',
  REJECTED: 'bad',
  PAID: 'good',
  CANCELLED: 'plain',
};
const STATUS_LABEL: Record<Status, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Waiting for approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
};

function monthStart(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const EMPTY_FORM = {
  categoryId: '',
  vendorId: '',
  vendorName: '',
  description: '',
  amount: '',
  hstAmount: '',
  expenseDate: '',
  paymentMethod: 'BANK_TRANSFER' as PaymentMethod,
  staffId: '',
  receiptNumber: '',
  notes: '',
};

// Reading ?new=1 needs a Suspense boundary in Next.js.
export default function ExpensesPage() {
  return (
    <Suspense fallback={null}>
      <Expenses />
    </Suspense>
  );
}

function Expenses() {
  const { t } = useT();
  const money = useMoney();
  const { showSuccess, showError } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  // Backend expense categories (to name existing expenses) and Accounting's categories (to pick from).
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [spendCats, setSpendCats] = useState<Category[]>([]);
  const searchParams = useSearchParams();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(monthStart(-2));
  const [to, setTo] = useState(todayLocal());
  const [statusFilter, setStatusFilter] = useState<'' | Status>('');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');

  const [catsOpen, setCatsOpen] = useState(false);

  const [rejecting, setRejecting] = useState<Expense | null>(null);
  const [reason, setReason] = useState('');

  const loadLists = useCallback(async () => {
    const [c, v, s, sc] = await Promise.allSettled([loadExpenseCategories(), loadVendors(), loadStaff(), loadSpendCategories()]);
    if (c.status === 'fulfilled') setCategories(c.value);
    if (sc.status === 'fulfilled') setSpendCats(sc.value);
    if (v.status === 'fulfilled') setVendors(v.value);
    if (s.status === 'fulfilled') setStaff(s.value);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ from, to });
      if (statusFilter) qs.set('status', statusFilter);
      const res = await apiRequest<any>(`/api/v1/expenses?${qs}`);
      const list = toList(res, 'expenses', 'items', 'data').map(
        (e: any): Expense => ({
          expenseId: String(pick(e, 'expenseId', 'id')),
          description: String(pick(e, 'description') ?? ''),
          amount: num(e, 'amount', 'totalAmount'),
          hstAmount: num(e, 'hstAmount', 'taxAmount'),
          vendorId: pick(e, 'vendorId', 'vendor.vendorId'),
          vendorName: pick(e, 'vendorName', 'vendor.name'),
          categoryId: pick(e, 'categoryId', 'category.categoryId'),
          categoryName: pick(e, 'categoryName', 'category.categoryName', 'category.name'),
          staffId: pick(e, 'staffId', 'staff.staffId'),
          staffName: pick(e, 'staffName', 'staff.fullName'),
          expenseDate: String(pick(e, 'expenseDate', 'date') ?? '').slice(0, 10),
          paymentMethod: pick(e, 'paymentMethod'),
          status: String(pick(e, 'status') ?? 'DRAFT').toUpperCase() as Status,
          receiptNumber: pick(e, 'receiptNumber'),
          notes: pick(e, 'notes'),
        })
      );
      list.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
      setExpenses(list);
    } catch (err) {
      showError(t('Could not load expenses'), errorText(err, ''));
    } finally {
      setLoading(false);
    }
  }, [from, to, statusFilter, showError, t]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);
  useEffect(() => {
    load();
  }, [load]);

  const catName = (e: Expense) => {
    const ec = categories.find((c) => c.categoryId === e.categoryId);
    return spendCats.find((c) => c.id === ec?.accountId)?.name || e.categoryName || ec?.name || '—';
  };
  const staffName = (e: Expense) => e.staffName || staff.find((s) => s.staffId === e.staffId)?.fullName;
  const vendorName = (e: Expense) => e.vendorName || vendors.find((v) => v.vendorId === e.vendorId)?.name;

  const totals = useMemo(() => {
    const live = expenses.filter((e) => e.status !== 'REJECTED' && e.status !== 'CANCELLED');
    return {
      spent: live.reduce((s, e) => s + e.amount, 0),
      hst: live.reduce((s, e) => s + e.hstAmount, 0),
      waiting: expenses.filter((e) => e.status === 'SUBMITTED' || e.status === 'APPROVED').length,
    };
  }, [expenses]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, expenseDate: todayLocal() });
    setOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      categoryId: categories.find((c) => c.categoryId === e.categoryId)?.accountId || '',
      vendorId: e.vendorId || '',
      vendorName: e.vendorId ? '' : e.vendorName || '',
      description: e.description,
      amount: String(e.amount),
      hstAmount: e.hstAmount ? String(e.hstAmount) : '',
      expenseDate: e.expenseDate,
      paymentMethod: e.paymentMethod || 'BANK_TRANSFER',
      staffId: e.staffId || '',
      receiptNumber: e.receiptNumber || '',
      notes: e.notes || '',
    });
    setOpen(true);
  };

  const set = (k: keyof typeof EMPTY_FORM) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: ev.target.value }));

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const amount = Number(form.amount);
    const hst = form.hstAmount === '' ? 0 : Number(form.hstAmount);
    if (!(amount > 0)) return showError(t('Enter an amount above zero'));
    if (hst < 0 || hst > amount) return showError(t('HST must be between zero and the amount'));
    setSaving(true);
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          description: form.description.trim(),
          amount,
          hstAmount: hst,
          expenseDate: form.expenseDate,
          notes: form.notes.trim() || undefined,
          vendorId: form.vendorId || null,
          vendorName: form.vendorId ? null : form.vendorName.trim() || null,
        };
        await apiRequest(`/api/v1/expenses/${editing.expenseId}`, { method: 'PUT', body: JSON.stringify(body) });
        showSuccess(t('Expense saved'));
      } else {
        const spendCat = spendCats.find((c) => c.id === form.categoryId);
        if (!spendCat) {
          setSaving(false);
          return showError(t('Pick a category'));
        }
        const body: Record<string, unknown> = {
          categoryId: await expenseCategoryFor(spendCat),
          description: form.description.trim(),
          amount,
          hstAmount: hst,
          currency: 'CAD',
          expenseDate: form.expenseDate,
          paymentMethod: form.paymentMethod,
        };
        if (form.vendorId) body.vendorId = form.vendorId;
        else if (form.vendorName.trim()) body.vendorName = form.vendorName.trim();
        if (form.staffId) body.staffId = form.staffId;
        if (form.receiptNumber.trim()) body.receiptNumber = form.receiptNumber.trim();
        if (form.notes.trim()) body.notes = form.notes.trim();
        await apiRequest('/api/v1/expenses', { method: 'POST', body: JSON.stringify(body) });
        showSuccess(t('Expense added'));
      }
      setOpen(false);
      load();
      loadExpenseCategories().then(setCategories).catch(() => {});
    } catch (err) {
      showError(t('Could not save the expense'), errorText(err, ''));
    } finally {
      setSaving(false);
    }
  };

  const step = async (e: Expense, action: 'submit' | 'approve' | 'process-payment', done: string) => {
    setBusyId(e.expenseId);
    try {
      await apiRequest(`/api/v1/expenses/${e.expenseId}/${action}`, { method: 'POST', body: '{}' });
      showSuccess(t(done));
      load();
    } catch (err) {
      showError(t('That did not work'), errorText(err, ''));
    } finally {
      setBusyId('');
    }
  };

  const reject = async () => {
    if (!rejecting || !reason.trim()) return;
    setBusyId(rejecting.expenseId);
    try {
      await apiRequest(`/api/v1/expenses/${rejecting.expenseId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectionReason: reason.trim() }),
      });
      showSuccess(t('Expense rejected'));
      setRejecting(null);
      setReason('');
      load();
    } catch (err) {
      showError(t('That did not work'), errorText(err, ''));
    } finally {
      setBusyId('');
    }
  };

  // Accounting's "Add expense" sends people here (?new=1) so every expense is added in one place.
  const wantsNew = searchParams.get('new') === '1';
  useEffect(() => {
    if (wantsNew) openNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsNew]);

  const amountNum = Number(form.amount) || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Expenses')}
        subtitle={t('Shop bills and staff spending, with who was paid and the HST you can claim back.')}
        actions={
          <>
            <Link href="/admin/bank" className={quietButton}>
              <Landmark className="h-4 w-4" /> {t('Bank import')}
            </Link>
            <button onClick={() => setCatsOpen(true)} className={quietButton}>
              <Tags className="h-4 w-4" /> {t('Categories')}
            </button>
            <button onClick={openNew} className={primaryButton}>
              <Plus className="h-4 w-4" /> {t('Add expense')}
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t('Spent')} value={money(totals.spent)} hint={t('HST included')} />
        <Stat label={t('HST to claim back')} value={money(totals.hst)} hint={t('Input tax credits')} />
        <Stat label={t('Waiting')} value={String(totals.waiting)} hint={t('To approve or pay')} />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <Field label={t('From')}>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t('To')}>
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t('Status')}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | '')} className={inputClass}>
            <option value="">{t('All')}</option>
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
              <option key={s} value={s}>
                {t(STATUS_LABEL[s])}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-end">
          <button onClick={load} className={`${quietButton} h-[42px] w-full`} aria-label={t('Refresh')}>
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <Loading text={t('Loading…')} />
        ) : expenses.length === 0 ? (
          <Empty
            icon={<Receipt className="h-6 w-6" />}
            title={t('No expenses in these dates')}
            text={t('Add one by hand, or import a bank statement to turn its lines into expenses.')}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={openNew} className={primaryButton}>
                  <Plus className="h-4 w-4" /> {t('Add expense')}
                </button>
                <Link href="/admin/bank" className={quietButton}>
                  <Landmark className="h-4 w-4" /> {t('Bank import')}
                </Link>
              </div>
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {expenses.map((e) => {
              const who = vendorName(e);
              const person = staffName(e);
              const busy = busyId === e.expenseId;
              return (
                <li key={e.expenseId} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <button onClick={() => openEdit(e)} className="flex min-w-0 items-start gap-3 text-start">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--foreground)]">{e.description || who || catName(e)}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        <span dir="ltr">{e.expenseDate}</span> · {catName(e)}
                        {who ? ` · ${who}` : ''}
                        {person ? ` · ${t('Spent by {name}', { name: person })}` : ''}
                      </p>
                    </div>
                  </button>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <div className="me-2 text-end">
                      <p className="text-sm font-bold tabular-nums text-[var(--foreground)]">{money(e.amount)}</p>
                      {e.hstAmount > 0 && (
                        <p className="text-[11px] tabular-nums text-[var(--muted-foreground)]">
                          {t('HST')} {money(e.hstAmount)}
                        </p>
                      )}
                    </div>
                    <Pill tone={STATUS_TONE[e.status]}>{t(STATUS_LABEL[e.status] || e.status)}</Pill>
                    {e.status === 'DRAFT' && (
                      <button disabled={busy} onClick={() => step(e, 'submit', 'Sent for approval')} className={quietButton}>
                        <Send className="h-3.5 w-3.5" /> {t('Submit')}
                      </button>
                    )}
                    {e.status === 'SUBMITTED' && (
                      <>
                        <button disabled={busy} onClick={() => step(e, 'approve', 'Expense approved')} className={quietButton}>
                          <Check className="h-3.5 w-3.5" /> {t('Approve')}
                        </button>
                        <button disabled={busy} onClick={() => setRejecting(e)} className={dangerButton}>
                          <X className="h-3.5 w-3.5" /> {t('Reject')}
                        </button>
                      </>
                    )}
                    {e.status === 'APPROVED' && (
                      <button disabled={busy} onClick={() => step(e, 'process-payment', 'Marked as paid')} className={primaryButton}>
                        <Wallet className="h-3.5 w-3.5" /> {t('Mark paid')}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Add / edit */}
      <Modal
        open={open}
        wide
        title={editing ? t('Edit expense') : t('Add expense')}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className={quietButton}>
              {t('Cancel')}
            </button>
            <button type="submit" form="expense-form" disabled={saving} className={primaryButton}>
              {saving ? t('Saving…') : t('Save')}
            </button>
          </>
        }
      >
        <form id="expense-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label={t('Category')} hint={editing ? t('The category and payment method are fixed once saved.') : undefined}>
            <select required value={form.categoryId} onChange={set('categoryId')} disabled={!!editing} className={inputClass}>
              <option value="">{t('Choose…')}</option>
              {spendCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(c.name)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('Date')}>
            <input type="date" required value={form.expenseDate} onChange={set('expenseDate')} className={inputClass} />
          </Field>
          <Field label={t('Vendor')} hint={t('Who was paid. Not in the list? Type the name below.')}>
            <select value={form.vendorId} onChange={set('vendorId')} className={inputClass}>
              <option value="">{t('Not in the list')}</option>
              {vendors.map((v) => (
                <option key={v.vendorId} value={v.vendorId}>
                  {v.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('Paid to (name)')}>
            <input value={form.vendorName} onChange={set('vendorName')} disabled={!!form.vendorId} className={inputClass} placeholder={form.vendorId ? '' : 'e.g. Kent Building Supplies'} />
          </Field>
          <Field label={t('What was it for?')} className="sm:col-span-2">
            <input required value={form.description} onChange={set('description')} className={inputClass} />
          </Field>
          <Field label={t('Amount, HST included')}>
            <input type="number" inputMode="decimal" step="0.01" min="0.01" required dir="ltr" value={form.amount} onChange={set('amount')} className={inputClass} />
          </Field>
          <Field label={t('HST in that amount')} hint={t('Leave empty if there was no HST.')}>
            <div className="flex gap-2">
              <input type="number" inputMode="decimal" step="0.01" min="0" dir="ltr" value={form.hstAmount} onChange={set('hstAmount')} className={inputClass} />
              <button
                type="button"
                disabled={!(amountNum > 0)}
                onClick={() => setForm((f) => ({ ...f, hstAmount: hstIncluded(amountNum).toFixed(2) }))}
                className={quietButton}
              >
                15%
              </button>
            </div>
          </Field>
          <Field label={t('Paid with')}>
            <select value={form.paymentMethod} onChange={set('paymentMethod')} disabled={!!editing} className={inputClass}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(PAYMENT_METHOD_LABEL[m])}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('Spent by (staff)')} hint={t('Leave as "Shop" for shop bills.')}>
            <select value={form.staffId} onChange={set('staffId')} disabled={!!editing} className={inputClass}>
              <option value="">{t('Shop')}</option>
              {staff.map((s) => (
                <option key={s.staffId} value={s.staffId}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </Field>
          {!editing && (
            <Field label={t('Receipt number')}>
              <input dir="ltr" value={form.receiptNumber} onChange={set('receiptNumber')} className={inputClass} />
            </Field>
          )}
          <Field label={t('Notes')} className={editing ? 'sm:col-span-2' : ''}>
            <input value={form.notes} onChange={set('notes')} className={inputClass} />
          </Field>
        </form>
      </Modal>

      {/* Categories: Accounting's own list */}
      <Modal open={catsOpen} title={t('Expense categories')} onClose={() => setCatsOpen(false)}>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t('Expenses use the same categories as Accounting, so every expense shows there under the right heading.')}
        </p>
        <ul className="flex flex-wrap gap-2">
          {spendCats.map((c) => (
            <li key={c.id}>
              <Pill tone="gold">{t(c.name)}</Pill>
            </li>
          ))}
        </ul>
        <Link href="/admin/accounting/categories" className={primaryButton}>
          <Tags className="h-4 w-4" /> {t('Add or rename categories in Accounting')}
        </Link>
      </Modal>

      {/* Reject */}
      <Modal
        open={!!rejecting}
        title={t('Reject expense')}
        onClose={() => setRejecting(null)}
        footer={
          <>
            <button onClick={() => setRejecting(null)} className={quietButton}>
              {t('Cancel')}
            </button>
            <button onClick={reject} disabled={!reason.trim() || !!busyId} className={dangerButton}>
              {t('Reject')}
            </button>
          </>
        }
      >
        <Field label={t('Reason')}>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} autoFocus />
        </Field>
      </Modal>
    </div>
  );
}
