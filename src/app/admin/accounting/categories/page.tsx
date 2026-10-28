'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';
import {
  Category,
  EntryType,
  addCategory,
  addSubCategory,
  listCategories,
  removeCategory,
  renameCategory,
} from '@/lib/moneyBook';
import { ArrowLeft, Check, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';

const inputClass =
  'px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]';

/** A name that turns into a text box when "rename" is pressed. */
function EditableName({
  name,
  onSave,
  className,
}: {
  name: string;
  onSave: (value: string) => Promise<boolean>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <span className={`inline-flex items-center gap-1 ${className || ''}`}>
        {name}
        <button
          onClick={() => {
            setValue(name);
            setEditing(true);
          }}
          className="p-1 rounded-md text-[var(--muted-foreground)] hover:text-[var(--primary)]"
          title="Rename"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </span>
    );
  }
  const save = async () => {
    if (value.trim() === name) return setEditing(false);
    setSaving(true);
    if (await onSave(value)) setEditing(false);
    setSaving(false);
  };
  return (
    <span className="inline-flex items-center gap-1">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') setEditing(false);
        }}
        className={`${inputClass} py-1`}
      />
      <button onClick={save} disabled={saving} className="p-1.5 rounded-lg bg-emerald-600 text-white disabled:opacity-50" title="Save">
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg bg-[var(--muted)] text-[var(--foreground)]" title="Cancel">
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

export default function CategoriesPage() {
  const { showSuccess, showError } = useToast();
  const [type, setType] = useState<EntryType>('OUT');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIsEquipment, setNewIsEquipment] = useState(false);
  const [newSub, setNewSub] = useState<Record<string, string>>({});

  // The toast helpers change on every render, so the loader reads them through a ref.
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setCategories(await listCategories());
    } catch (err: any) {
      showErrorRef.current('Could Not Load Categories', err.message || 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Runs a change, reloads the list, and reports whether it worked.
  const run = async (action: () => Promise<void>, done: string): Promise<boolean> => {
    setBusy(true);
    try {
      await action();
      showSuccess('Saved', done);
      await load();
      return true;
    } catch (err: any) {
      showError('Could Not Save', err.message || 'Please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const shown = categories.filter((c) => c.type === type);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (await run(() => addCategory({ name, type, equipment: newIsEquipment }), `"${name}" was added.`)) {
      setNewName('');
      setNewIsEquipment(false);
    }
  };

  const handleAddSub = async (c: Category) => {
    const name = (newSub[c.id] || '').trim();
    if (await run(() => addSubCategory(c, name), `"${name}" was added to ${c.name}.`)) {
      setNewSub((m) => ({ ...m, [c.id]: '' }));
    }
  };

  const handleRemove = (id: string, name: string, isCategory: boolean) => {
    const message = isCategory
      ? `Remove "${name}" and its sub-categories? Past entries keep this category.`
      : `Remove "${name}"? Past entries keep it.`;
    if (!confirm(message)) return;
    run(() => removeCategory(id), `"${name}" was removed.`);
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/accounting" className="p-2 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)]" title="Back to Accounting">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Categories</h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            Add, rename or remove what you choose from when you add income or an expense.
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-xl text-[var(--muted-foreground)]" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 max-w-sm">
        {(['IN', 'OUT'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`py-2 rounded-xl text-xs font-bold border ${
              type === t
                ? t === 'IN'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-rose-600 text-white border-rose-600'
                : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]'
            }`}
          >
            {t === 'IN' ? 'Income' : 'Expenses'}
          </button>
        ))}
      </div>

      {/* New category */}
      <form onSubmit={handleAdd} className="glass-card rounded-2xl border border-[var(--border)] p-4 space-y-3">
        <p className="text-sm font-black text-[var(--foreground)]">New {type === 'IN' ? 'income' : 'expense'} category</p>
        <div className="flex flex-wrap gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={type === 'IN' ? 'e.g. Gift cards' : 'e.g. Laundry'}
            className={`${inputClass} flex-1 min-w-[180px]`}
          />
          <button type="submit" disabled={busy || !newName.trim()} className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Add category
          </button>
        </div>
        {type === 'OUT' && (
          <label className="flex items-start gap-2 text-xs text-[var(--foreground)] cursor-pointer">
            <input type="checkbox" checked={newIsEquipment} onChange={(e) => setNewIsEquipment(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--primary)]" />
            <span>
              <strong>Equipment</strong>
              <span className="block text-[11px] text-[var(--muted-foreground)]">
                Tick for things the shop keeps for years (chairs, clippers). Your accountant writes them off over time.
              </span>
            </span>
          </label>
        )}
      </form>

      {/* Existing categories */}
      {isLoading && categories.length === 0 ? (
        <p className="p-8 text-center text-xs text-[var(--muted-foreground)]">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="p-8 text-center text-xs text-[var(--muted-foreground)]">No categories yet. Add one above.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((c) => (
            <div key={c.id} className="glass-card rounded-2xl border border-[var(--border)] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <EditableName
                    name={c.name}
                    className="text-sm font-black text-[var(--foreground)]"
                    onSave={(v) => run(() => renameCategory(c.id, v, shown.filter((x) => x.id !== c.id).map((x) => x.name)), 'Name changed.')}
                  />
                  {c.equipment && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">Equipment</span>
                  )}
                </div>
                {c.locked ? (
                  <span className="text-[10px] text-[var(--muted-foreground)]">Used for tips at checkout</span>
                ) : (
                  <button
                    onClick={() => handleRemove(c.id, c.name, true)}
                    disabled={busy}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {c.subs.length === 0 && <span className="text-[11px] text-[var(--muted-foreground)]">No sub-categories.</span>}
                {c.subs.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-0.5 pl-2.5 pr-1 py-1 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[11px] font-bold text-[var(--foreground)]">
                    <EditableName
                      name={s.name}
                      onSave={(v) => run(() => renameCategory(s.id, v, c.subs.filter((x) => x.id !== s.id).map((x) => x.name)), 'Name changed.')}
                    />
                    <button
                      onClick={() => handleRemove(s.id, s.name, false)}
                      disabled={busy}
                      className="p-1 rounded-md text-[var(--muted-foreground)] hover:text-rose-600"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={newSub[c.id] || ''}
                  onChange={(e) => setNewSub((m) => ({ ...m, [c.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSub(c);
                    }
                  }}
                  placeholder="New sub-category"
                  className={`${inputClass} flex-1 min-w-0 py-1.5`}
                />
                <button
                  onClick={() => handleAddSub(c)}
                  disabled={busy || !(newSub[c.id] || '').trim()}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] flex items-center gap-1 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-[var(--muted-foreground)]">
        Appointments, walk-ins and HST are recorded automatically and are not listed here. Removing a category hides it from the
        list; entries already saved keep it, so your reports stay complete.
      </p>
    </div>
  );
}
