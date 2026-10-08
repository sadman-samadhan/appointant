'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { KPICard } from '@/components/ui/KPICard';
import { useToast } from '@/context/ToastContext';
import { formatMoney, todayISO } from '@/lib/format';
import {
  MoneyEntry,
  EntryType,
  PaidWith,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  addEntry,
  listEntries,
  removeEntry,
} from '@/lib/moneyBook';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  RefreshCw,
  Trash2,
  Wallet,
  BookOpen,
} from 'lucide-react';

function monthBounds(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    from: `${year}-${pad(month + 1)}-01`,
    to: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
    label: new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  };
}

export default function MoneyBookPage() {
  const { showSuccess, showError } = useToast();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [entries, setEntries] = useState<MoneyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | EntryType>('ALL');

  // Add entry form
  const [showModal, setShowModal] = useState(false);
  const [entryType, setEntryType] = useState<EntryType>('IN');
  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState(todayISO());
  const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
  const [note, setNote] = useState('');
  const [paidWith, setPaidWith] = useState<PaidWith>('CASH');
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const period = monthBounds(year, month);

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

  const totals = useMemo(() => {
    const moneyIn = entries.filter((e) => e.type === 'IN').reduce((s, e) => s + e.amount, 0);
    const moneyOut = entries.filter((e) => e.type === 'OUT').reduce((s, e) => s + e.amount, 0);
    return { moneyIn, moneyOut, profit: moneyIn - moneyOut };
  }, [entries]);

  const byCategory = useMemo(() => {
    const map = new Map<string, { type: EntryType; total: number }>();
    for (const e of entries) {
      const key = `${e.type}:${e.category}`;
      const cur = map.get(key) || { type: e.type, total: 0 };
      cur.total += e.amount;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({ category: key.split(':').slice(1).join(':'), ...v }))
      .sort((a, b) => b.total - a.total);
  }, [entries]);

  const visibleEntries = filter === 'ALL' ? entries : entries.filter((e) => e.type === filter);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const openModal = (type: EntryType) => {
    setEntryType(type);
    setCategory(type === 'IN' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    setAmount('');
    setNote('');
    setEntryDate(todayISO());
    setPaidWith('CASH');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!(value > 0)) {
      showError('Amount Required', 'Enter an amount greater than zero.');
      return;
    }
    setIsSaving(true);
    try {
      await addEntry({ type: entryType, amount: value, date: entryDate, category, note, paidWith });
      showSuccess(
        entryType === 'IN' ? 'Money In Saved' : 'Money Out Saved',
        `$${formatMoney(value)} CAD · ${category}`
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
    if (!confirm(`Remove this ${entry.type === 'IN' ? 'money in' : 'money out'} entry of $${formatMoney(entry.amount)}?`)) return;
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

  const categories = entryType === 'IN' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[var(--primary)]" />
            Money Book
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Write down money coming in and going out. We keep the accounting behind the scenes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openModal('IN')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Money In</span>
          </button>
          <button
            onClick={() => openModal('OUT')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>Money Out</span>
          </button>
        </div>
      </div>

      {/* Month switcher */}
      <div className="glass-card p-3 rounded-2xl flex items-center justify-between border border-[var(--border)]">
        <button
          onClick={() => shiftMonth(-1)}
          className="p-2 rounded-xl hover:bg-[var(--muted)] text-[var(--foreground)]"
          title="Previous month"
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
          onClick={() => shiftMonth(1)}
          className="p-2 rounded-xl hover:bg-[var(--muted)] text-[var(--foreground)]"
          title="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          label="Money In"
          value={`$${formatMoney(totals.moneyIn)}`}
          sub="Income this month"
          icon={ArrowDownCircle}
          accentColor="text-emerald-600"
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/40"
        />
        <KPICard
          label="Money Out"
          value={`$${formatMoney(totals.moneyOut)}`}
          sub="Spending this month"
          icon={ArrowUpCircle}
          accentColor="text-rose-600"
          iconBgColor="bg-rose-50 dark:bg-rose-950/40"
        />
        <KPICard
          label={totals.profit >= 0 ? 'Profit' : 'Loss'}
          value={`${totals.profit < 0 ? '-' : ''}$${formatMoney(Math.abs(totals.profit))}`}
          sub="Money in minus money out"
          icon={PiggyBank}
          accentColor={totals.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}
          iconBgColor={totals.profit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-rose-50 dark:bg-rose-950/40'}
        />
      </div>

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
                  {f === 'ALL' ? 'All' : f === 'IN' ? 'Money In' : 'Money Out'}
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
                Use <strong>Money In</strong> when you get paid and <strong>Money Out</strong> when you pay for something.
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
                      <p className="text-xs font-black text-[var(--foreground)]">{entry.category}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                        {entry.date} · {entry.paidWith === 'BANK' ? 'Bank' : 'Cash'}
                        {entry.note ? ` · ${entry.note}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-black ${entry.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {entry.type === 'IN' ? '+' : '-'}${formatMoney(entry.amount)}
                    </span>
                    <button
                      onClick={() => handleRemove(entry)}
                      disabled={removingId === entry.id}
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
          <h2 className="text-sm font-black text-[var(--foreground)]">Where the money went</h2>
          {byCategory.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)]">No entries yet this month.</p>
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
        title={entryType === 'IN' ? 'Money In' : 'Money Out'}
        maxWidth="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['IN', 'OUT'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setEntryType(t);
                  setCategory(t === 'IN' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
                }}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                  entryType === t
                    ? t === 'IN'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-rose-600 text-white border-rose-600'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]'
                }`}
              >
                {t === 'IN' ? 'Money In' : 'Money Out'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Amount (CAD $)</label>
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
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                    category === c
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'bg-[var(--muted)] text-[var(--foreground)] border-[var(--border)]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

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
              placeholder={entryType === 'IN' ? 'e.g. Saturday walk-ins' : 'e.g. Hydro bill for October'}
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
