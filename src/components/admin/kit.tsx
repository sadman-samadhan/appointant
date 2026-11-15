'use client';

// Small shared pieces for the money pages (vendors, expenses, bank, payroll), so they look alike.
// Every text passed in is already translated by the page (useT).
import React from 'react';
import { X, Loader2 } from 'lucide-react';

export const inputClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-ring)] disabled:opacity-60';

export const primaryButton =
  'btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold whitespace-nowrap disabled:opacity-60 disabled:pointer-events-none';

export const quietButton =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-bold text-[var(--foreground)] whitespace-nowrap transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-60 disabled:pointer-events-none';

export const dangerButton =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300/60 px-3 py-2 text-xs font-bold text-red-600 whitespace-nowrap transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-60';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold tracking-wide text-[var(--foreground)]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass-card rounded-xl ${className}`}>{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-[var(--foreground)] tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{hint}</p>}
    </Card>
  );
}

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="block text-xs font-bold text-[var(--foreground)]">{label}</span>
      {children}
      {hint && <span className="block text-[11px] leading-snug text-[var(--muted-foreground)]">{hint}</span>}
    </label>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`glass-card flex max-h-[92vh] w-full flex-col rounded-t-xl sm:rounded-xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-display text-lg font-bold tracking-wide text-[var(--foreground)]">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="space-y-3 px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">{icon}</div>
      <h3 className="text-sm font-bold text-[var(--foreground)]">{title}</h3>
      {text && <p className="mx-auto max-w-sm text-sm text-[var(--muted-foreground)]">{text}</p>}
      {action}
    </div>
  );
}

export function Loading({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-[var(--muted-foreground)]">
      <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" /> {text}
    </div>
  );
}

const PILL: Record<string, string> = {
  good: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  warn: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  bad: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
  gold: 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary-ring)]',
  plain: 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]',
};

export function Pill({ tone = 'plain', children }: { tone?: keyof typeof PILL; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold ${PILL[tone]}`}>
      {children}
    </span>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string }[];
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
            value === it.value
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/** Reads the first present field, so the page copes with small differences in the backend's replies. */
export function pick<T = any>(obj: any, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const v = k.split('.').reduce((o, part) => (o == null ? undefined : o[part]), obj);
    if (v !== undefined && v !== null && v !== '') return v as T;
  }
  return undefined;
}

export function num(obj: any, ...keys: string[]): number {
  const v = pick(obj, ...keys);
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
