import React from 'react';

export type BadgeVariant =
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'SCHEDULED'
  | 'DRAFT'
  | 'LOCKED'
  | 'CHECKED_IN'
  | 'NO_SHOW'
  | 'PAID'
  | 'UNPAID'
  | 'PARTIAL'
  | 'VOID';

// Plain words for booking states; anything else is shown as-is.
export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Booked',
  LOCKED: 'Booked',
  SCHEDULED: 'Booked',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Arrived',
  COMPLETED: 'Done',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
};

interface BadgeProps {
  variant: BadgeVariant | string;
  size?: 'sm' | 'md';
}

export function Badge({ variant, size = 'sm' }: BadgeProps) {
  const normalized = String(variant ?? '').toUpperCase();

  const styles: Record<string, string> = {
    CONFIRMED: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900',
    COMPLETED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
    PAID: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
    CANCELLED: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900',
    VOID: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900',
    UNPAID: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900',
    NO_SHOW: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900',
    CHECKED_IN: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-900',
    PARTIAL: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900',
    SCHEDULED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    ACTIVE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
    TERMINATED: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900',
    LOCKED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  };

  const currentStyle = styles[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';
  const sizeStyle = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-bold rounded-full border ${currentStyle} ${sizeStyle}`}>
      {STATUS_LABELS[normalized] || normalized}
    </span>
  );
}
