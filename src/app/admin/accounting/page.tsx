'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { KPICard } from '@/components/ui/KPICard';
import { useToast } from '@/context/ToastContext';
import { formatMoney, todayISO } from '@/lib/format';
import {
  MoneyEntry,
  EntryType,
  PaidWith,
  Category,
  addEntry,
  defaultIncludesHst,
  hstIncluded,
  listCategories,
  listEntries,
  rememberIncludesHst,
  removeEntry,
} from '@/lib/moneyBook';
import { BUSINESS } from '@/lib/business';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  PiggyBank,
  Tags,
  RefreshCw,
  Trash2,
  Wallet,
} from 'lucide-react';

type PeriodMode = 'day' | 'month' | 'year';

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** The dates covered by a day, month or year around `anchor`, and how to name it. */
function periodBounds(mode: PeriodMode, anchor: string) {
  const d = dateOf(anchor);
  const y = d.getFullYear();
  const m = d.getMonth();
  if (mode === 'day') {
    const label =
      anchor === todayISO()
        ? `Today, ${d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`
        : d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    return { from: anchor, to: anchor, label, word: 'This day' };
  }
  if (mode === 'year') return { from: `${y}-01-01`, to: `${y}-12-31`, label: String(y), word: 'This year' };
  return {
    from: `${y}-${pad(m + 1)}-01`,
    to: isoOf(new Date(y, m + 1, 0)),
    label: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    word: 'This month',
  };
}

export default function MoneyBookPage() {
  const { showSuccess, showError } = useToast();

  const [mode, setMode] = useState<PeriodMode>('month');
  const [anchor, setAnchor] = useState(todayISO());
  const [entries, setEntries] = useState<MoneyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | EntryType>('ALL');

  // Add entry form
  const [showModal, setShowModal] = useState(false);
  const [entryType, setEntryType] = useState<EntryType>('IN');
  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState(todayISO());
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const categoryIdRef = useRef('');
  categoryIdRef.current = categoryId;
  const [subId, setSubId] = useState('');
  const [includesHst, setIncludesHst] = useState(true);
  const [note, setNote] = useState('');
  const [paidWith, setPaidWith] = useState<PaidWith>('CASH');
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const period = periodBounds(mode, anchor);
  const isCurrent = period.from <= todayISO() && todayISO() <= period.to;

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setEntries(await listEntries(period.from, period.to));
    } catch (err: any) {
      setEntries([]);
      setLoadError(err.message || 'Could not load the money book.');
    } finally {
      setIsLoading(false);
    }
  }, [period.from, period.to]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    listCategories().then(setAllCategories).catch(() => {});
  }, []);

  // Income and expenses are shown before HST: the HST collected belongs to the CRA.
  const totals = useMemo(() => {
    const sum = (type: EntryType, f: (e: MoneyEntry) => number) =>
      entries.filter((e) => e.type === type).reduce((s, e) => s + f(e), 0);
    const income = sum('IN', (e) => e.amount - e.tax);
    const expenses = sum('OUT', (e) => e.amount - e.tax);
    const hstCollected = sum('IN', (e) => e.tax);
    const hstPaid = sum('OUT', (e) => e.tax);
    return { income, expenses, profit: income - expenses, hstCollected, hstPaid };
  }, [entries]);

  const byCategory = useMemo(() => {
    const map = new Map<string, { type: EntryType; total: number }>();
    for (const e of entries) {
      const key = `${e.type}:${e.category}`;
      const cur = map.get(key) || { type: e.type, total: 0 };
      cur.total += e.amount - e.tax;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({ category: key.split(':').slice(1).join(':'), ...v }))
      .filter((c) => Math.abs(c.total) >= 0.005)
      .sort((a, b) => b.total - a.total);
  }, [entries]);

  const visibleEntries = filter === 'ALL' ? entries : entries.filter((e) => e.type === filter);

  const shiftPeriod = (delta: number) => {
    const d = dateOf(anchor);
    if (mode === 'day') d.setDate(d.getDate() + delta);
    else if (mode === 'month') d.setMonth(d.getMonth() + delta, 1);
    else d.setFullYear(d.getFullYear() + delta, 0, 1);
    setAnchor(isoOf(d));
  };

  const chooseCategory = (c: Category | undefined) => {
    setCategoryId(c?.id || '');
    setSubId('');
    setIncludesHst(c ? defaultIncludesHst(c) : true);
  };

  const chooseType = (type: EntryType, list = allCategories) => {
    setEntryType(type);
    chooseCategory(list.find((c) => c.type === type));
  };

  const openModal = async (type: EntryType) => {
    chooseType(type);
    // Categories can be changed on the Categories page, so always show the current list.
    listCategories()
      .then((list) => {
        setAllCategories(list);
        // Keep what the owner already picked while the list was loading, if it still exists.
        if (!list.some((c) => c.id === categoryIdRef.current && c.type === type)) chooseType(type, list);
      })
      .catch((err) => showError('Could Not Load Categories', err.message || 'Please try again.'));
    setAmount('');
    setNote('');
    setEntryDate(todayISO());
    setPaidWith('CASH');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!selectedCategory) {
      showError('Category Required', 'Pick what it was for.');
      return;
    }
    if (!(value > 0)) {
      showError('Amount Required', 'Enter an amount greater than zero.');
      return;
    }
    setIsSaving(true);
    try {
      await addEntry({
        type: entryType,
        amount: value,
        tax: includesHst ? hstIncluded(value) : 0,
        date: entryDate,
        category: selectedCategory,
        sub: selectedSub,
        note,
        paidWith,
      });
      rememberIncludesHst(selectedCategory.id, includesHst);
      showSuccess(
        entryType === 'IN' ? 'Income Saved' : 'Expense Saved',
        `$${formatMoney(value)} CAD · ${selectedSub?.name || selectedCategory.name}`
      );
      setShowModal(false);
      loadEntries();
    } catch (err: any) {
      showError('Could Not Save', err.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (entry: MoneyEntry) => {
    if (!confirm(`Remove this ${entry.type === 'IN' ? 'income' : 'expense'} entry of $${formatMoney(entry.amount)}?`)) return;
    setRemovingId(entry.id);
    try {
      await removeEntry(entry.id);
      showSuccess('Entry Removed', 'The entry was cancelled in the books.');
      loadEntries();
    } catch (err: any) {
      showError('Could Not Remove', err.message || 'Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const categories = allCategories.filter((c) => c.type === entryType);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedSub = selectedCategory?.subs.find((s) => s.id === subId) || null;
  const subs = selectedCategory?.subs || [];
  const amountValue = parseFloat(amount) || 0;
  const hstOwed = totals.hstCollected - totals.hstPaid;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-[var(--primary)]" />
            Accounting
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Money from appointments is added automatically. Add other income and expenses yourself.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/accounting/categories"
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] flex items-center gap-1.5"
          >
            <Tags className="w-4 h-4" />
            <span>Categories</span>
          </Link>
          <Link
            href="/admin/accounting/report"
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>Report for accountant</span>
          </Link>
          <button
            onClick={() => openModal('IN')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Add income</span>
          </button>
          <button
            onClick={() => openModal('OUT')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>Add expense</span>
          </button>
        </div>
      </div>

      {/* Period: a day, a month or a year */}
      <div className="glass-card p-3 rounded-2xl border border-[var(--border)] space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="flex rounded-xl bg-[var(--muted)] p-1">
          {(
            [
              ['day', 'Day'],
              ['month', 'Month'],
              ['year', 'Year'],
            ] as [PeriodMode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold ${
                mode === m ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {!isCurrent && (
          <button
            onClick={() => setAnchor(todayISO())}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)]"
          >
            Back to today
          </button>
        )}
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={() => shiftPeriod(-1)}
          className="p-2 rounded-xl hover:bg-[var(--muted)] text-[var(--foreground)]"
          title={`Previous ${mode}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-[var(--foreground)]">{period.label}</span>
          <button
            onClick={loadEntries}
            className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <button
          onClick={() => shiftPeriod(1)}
          className="p-2 rounded-xl hover:bg-[var(--muted)] text-[var(--foreground)]"
          title={`Next ${mode}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          label="Income"
          value={`$${formatMoney(totals.income)}`}
          sub={`${period.word}, before HST`}
          icon={ArrowDownCircle}
          accentColor="text-emerald-600"
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/40"
        />
        <KPICard
          label="Expenses"
          value={`$${formatMoney(totals.expenses)}`}
          sub={`${period.word}, before HST`}
          icon={ArrowUpCircle}
          accentColor="text-rose-600"
          iconBgColor="bg-rose-50 dark:bg-rose-950/40"
        />
        <KPICard
          label={totals.profit >= 0 ? 'Profit' : 'Loss'}
          value={`${totals.profit < 0 ? '-' : ''}$${formatMoney(Math.abs(totals.profit))}`}
          sub="Income minus expenses"
          icon={PiggyBank}
          accentColor={totals.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}
          iconBgColor={totals.profit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-rose-50 dark:bg-rose-950/40'}
        />
      </div>

      {(totals.hstCollected > 0 || totals.hstPaid > 0) && (
        <p className="text-xs text-[var(--muted-foreground)] -mt-2">
          {BUSINESS.taxLabel} collected ${formatMoney(totals.hstCollected)} · {BUSINESS.taxLabel} paid on expenses $
          {formatMoney(totals.hstPaid)} ·{' '}
          <strong className="text-[var(--foreground)]">
            {hstOwed >= 0 ? `Owed to the CRA: $${formatMoney(hstOwed)}` : `Refund from the CRA: $${formatMoney(-hstOwed)}`}
          </strong>
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entries list */}
        <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-sm font-black text-[var(--foreground)]">Entries</h2>
            <div className="flex items-center gap-1 text-[11px] font-bold">
              {(['ALL', 'IN', 'OUT'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    filter === f
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {f === 'ALL' ? 'All' : f === 'IN' ? 'Income' : 'Expenses'}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">Loading entries...</div>
          ) : loadError ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-xs font-bold text-rose-600">{loadError}</p>
              <button onClick={loadEntries} className="btn-primary px-4 py-2 rounded-xl text-xs font-bold">
                Try Again
              </button>
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Wallet className="w-10 h-10 text-[var(--muted-foreground)] mx-auto opacity-40" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">Nothing written down for {period.label}</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                Use <strong>Add income</strong> when you get paid and <strong>Add expense</strong> when you pay for something.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {visibleEntries.map((entry) => (
                <div key={entry.id} className="p-4 flex items-center justify-between gap-3 hover:bg-[var(--muted)]/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        entry.type === 'IN'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40'
                      }`}
                    >
                      {entry.type === 'IN' ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[var(--foreground)]">
                        {entry.category}
                        {entry.subcategory ? ` · ${entry.subcategory}` : ''}
                      </p>
                      <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                        {entry.date}
                        {entry.fromAppointment ? '' : ` · ${entry.paidWith === 'BANK' ? 'Bank' : 'Cash'}`}
                        {entry.note ? ` · ${entry.note}` : ''}
                        {entry.tax > 0 && entry.category !== 'Sales tax' ? ` · incl. ${BUSINESS.taxLabel} $${formatMoney(entry.tax)}` : ''}
                        {entry.tip > 0 && entry.fromAppointment ? ` · tip $${formatMoney(entry.tip)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-black ${entry.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {entry.type === 'IN' && entry.amount >= 0 ? '+' : '-'}${formatMoney(Math.abs(entry.amount))}
                    </span>
                    <button
                      onClick={() => handleRemove(entry)}
                      disabled={removingId === entry.id}
                      hidden={entry.fromAppointment}
                      className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40"
                      title="Remove entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="glass-card rounded-2xl border border-[var(--border)] p-4 space-y-3 h-fit">
          <h2 className="text-sm font-black text-[var(--foreground)]">By category (before HST)</h2>
          {byCategory.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)]">Nothing recorded for {period.label}.</p>
          ) : (
            byCategory.map((c) => (
              <div key={`${c.type}-${c.category}`} className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--foreground)]">
                  <span className={c.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}>{c.type === 'IN' ? '▲' : '▼'}</span>{' '}
                  {c.category}
                </span>
                <span className="font-black text-[var(--foreground)]">${formatMoney(c.total)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add entry modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={entryType === 'IN' ? 'Add income' : 'Add expense'}
        maxWidth="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['IN', 'OUT'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => chooseType(t)}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                  entryType === t
                    ? t === 'IN'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-rose-600 text-white border-rose-600'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]'
                }`}
              >
                {t === 'IN' ? 'Income' : 'Expense'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              {entryType === 'IN' ? 'Amount received (CAD $)' : 'Amount paid (CAD $)'}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              required
              autoFocus
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-lg font-black text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              {entryType === 'IN' ? 'What was it for?' : 'What did you pay for?'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.length === 0 && <p className="text-xs text-[var(--muted-foreground)]">Loading categories…</p>}
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => chooseCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                    categoryId === c.id
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'bg-[var(--muted)] text-[var(--foreground)] border-[var(--border)]'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {subs.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">What exactly? (optional)</label>
              <div className="flex flex-wrap gap-1.5">
                {subs.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSubId(subId === s.id ? '' : s.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                      subId === s.id
                        ? 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]'
                        : 'bg-[var(--muted)] text-[var(--foreground)] border-[var(--border)]'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-start gap-2 text-xs text-[var(--foreground)] cursor-pointer">
            <input
              type="checkbox"
              checked={includesHst}
              onChange={(e) => setIncludesHst(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[var(--primary)]"
            />
            <span>
              <strong>Amount includes {BUSINESS.taxLabel}</strong>
              {includesHst && amountValue > 0 && (
                <span className="text-[var(--muted-foreground)]"> · {BUSINESS.taxLabel} ${formatMoney(hstIncluded(amountValue))}</span>
              )}
              <span className="block text-[11px] text-[var(--muted-foreground)]">
                {entryType === 'IN' ? 'Tick if you charged the customer HST.' : 'Tick if the receipt shows HST.'}
              </span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Date</label>
              <input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                {entryType === 'IN' ? 'Received as' : 'Paid with'}
              </label>
              <select
                value={paidWith}
                onChange={(e) => setPaidWith(e.target.value as PaidWith)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              >
                <option value="CASH">Cash</option>
                <option value="BANK">Bank</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Note (optional)</label>
            <input
              type="text"
              placeholder={entryType === 'IN' ? 'e.g. Sold 2 pomades' : 'e.g. NB Power bill, October'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 ${
                entryType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
