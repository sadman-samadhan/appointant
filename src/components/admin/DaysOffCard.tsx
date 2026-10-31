'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CalendarOff, Trash2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { todayISO, wallClockTime } from '@/lib/format';
import { addDayOff, loadBarbers, loadDaysOff, removeDayOff, type Barber, type DayOff } from '@/lib/shopBookings';
import { useConfirm } from '@/context/ConfirmContext';

const inputClass =
  'w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]';
const labelClass = 'block text-[11px] font-bold text-[var(--muted-foreground)] mb-1';

const prettyDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const isWholeDay = (d: DayOff) => d.start.startsWith('00:00') && d.end.startsWith('23:59');

/**
 * One-off time off: a barber's sick day or a few hours away, or the whole shop closed for a
 * holiday. Those times can't be booked, online or by the owner.
 */
export function DaysOffCard() {
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);
  const [who, setWho] = useState('');
  const [date, setDate] = useState(todayISO());
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState('12:00');
  const [end, setEnd] = useState('15:00');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => {
    loadBarbers().then(setBarbers).catch(() => setBarbers([]));
    loadDaysOff()
      .then((list) => setDaysOff(list.filter((d) => d.date >= todayISO())))
      .catch(() => setDaysOff([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const nameOf = (d: DayOff) => (d.staffId ? barbers.find((b) => b.staffId === d.staffId)?.name || 'A barber' : 'Whole shop');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || date < todayISO()) return showError('Pick a date', 'Choose today or a later day.');
    if (!allDay && !(start < end)) return showError('Check the times', 'The end time must be after the start time.');
    setIsSaving(true);
    try {
      await addDayOff({ staffId: who || undefined, date, start: allDay ? undefined : start, end: allDay ? undefined : end, reason });
      showSuccess('Saved', `${who ? barbers.find((b) => b.staffId === who)?.name : 'The shop'} is off on ${prettyDate(date)}.`);
      setReason('');
      load();
    } catch (err: any) {
      showError('Could not save', err?.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (d: DayOff) => {
    if (!(await confirm({ title: 'Remove time off', message: `Remove ${nameOf(d)}'s time off on ${prettyDate(d.date)}?`, confirmLabel: 'Remove', danger: true }))) return;
    try {
      await removeDayOff(d.id);
      load();
    } catch (err: any) {
      showError('Could not remove', err?.message || 'Please try again.');
    }
  };

  return (
    <div className="glass-card p-5 rounded-2xl border border-[var(--border)] space-y-4">
      <div>
        <h2 className="text-sm font-black text-[var(--foreground)] flex items-center gap-2">
          <CalendarOff className="w-4 h-4 text-[var(--primary)]" /> Days off & holidays
        </h2>
        <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
          A barber off sick, away for a few hours, or the shop closed. Those times can&apos;t be booked.
        </p>
      </div>

      {daysOff.length > 0 && (
        <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
          {daysOff.map((d) => (
            <li key={d.id} className="px-3 py-2 flex items-center justify-between gap-3 text-xs">
              <span className="text-[var(--foreground)]">
                <strong>{prettyDate(d.date)}</strong> · {nameOf(d)} ·{' '}
                {isWholeDay(d) ? 'all day' : `${wallClockTime(d.start)}–${wallClockTime(d.end)}`}
                {d.reason ? <span className="text-[var(--muted-foreground)]"> · {d.reason}</span> : null}
              </span>
              <button onClick={() => handleRemove(d)} title="Remove" className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-rose-600 hover:bg-rose-50">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className={labelClass}>Who</label>
          <select value={who} onChange={(e) => setWho(e.target.value)} className={inputClass}>
            <option value="">Whole shop (closed)</option>
            {barbers.map((b) => (
              <option key={b.staffId} value={b.staffId}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="flex items-center gap-2 text-xs font-bold text-[var(--foreground)] mb-1">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day
          </label>
          {!allDay && (
            <div className="flex items-center gap-1">
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
              <span className="text-xs">–</span>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
            </div>
          )}
        </div>
        <div>
          <label className={labelClass}>Reason (optional)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Holiday" className={inputClass} />
        </div>
        <div className="col-span-2 sm:col-span-4 flex justify-end">
          <button type="submit" disabled={isSaving} className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50">
            {isSaving ? 'Saving…' : 'Add time off'}
          </button>
        </div>
      </form>
    </div>
  );
}
