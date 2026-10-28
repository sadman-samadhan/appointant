'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Badge, STATUS_LABELS } from '@/components/ui/Badge';
import { useToast } from '@/context/ToastContext';
import { BUSINESS } from '@/lib/business';
import { formatMoney, todayISO, wallClockTime } from '@/lib/format';
import { formatPhoneInput, isValidPhone, PHONE_ERROR, PHONE_PLACEHOLDER } from '@/lib/phone';
import { freeStartTimes, openingHours } from '@/lib/slots';
import {
  ACTIVE_STATUSES,
  ShopBooking,
  ShopService,
  billFor,
  cancelBooking,
  confirmBooking,
  createBooking,
  findOrCreateCustomer,
  finishAndPay,
  loadBookings,
  loadServices,
  loadWalkIns,
  markArrived,
  markNoShow,
  money,
  recordWalkIn,
  rescheduleBooking,
  taxOn,
} from '@/lib/shopBookings';
import { Banknote, CalendarClock, Check, Plus, RefreshCw, Search, UserCheck, UserX, X, Footprints } from 'lucide-react';

const inputClass =
  'w-full px-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]';
const labelClass = 'block text-xs font-bold text-[var(--foreground)] mb-1';

type View = 'today' | 'upcoming' | 'all';

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function prettyDate(iso: string) {
  if (!iso) return '';
  if (iso === todayISO()) return 'Today';
  if (iso === addDays(todayISO(), 1)) return 'Tomorrow';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** Day buttons + free time buttons. Taken times are never offered, so the shop can't double-book. */
function TimePicker({
  bookings,
  durationMinutes,
  date,
  time,
  onDate,
  onTime,
  excludeBookingId,
}: {
  bookings: ShopBooking[];
  durationMinutes: number;
  date: string;
  time: string;
  onDate: (d: string) => void;
  onTime: (t: string) => void;
  excludeBookingId?: string;
}) {
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(todayISO(), i)).filter((d) => openingHours(d)), []);
  useEffect(() => {
    if (days.length > 0 && !days.includes(date)) onDate(days[0]);
  }, [days, date, onDate]);
  const times = freeStartTimes({
    date,
    durationMinutes,
    bookings,
    excludeBookingId,
    notBeforeMinutes: date === todayISO() ? nowMinutes() - 1 : undefined,
  });
  return (
    <div className="space-y-3">
      <div>
        <p className={labelClass}>Day</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {days.map((d) => {
            const [y, m, dd] = d.split('-').map(Number);
            const dt = new Date(y, m - 1, dd);
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  onDate(d);
                  onTime('');
                }}
                className={`shrink-0 w-12 py-1.5 rounded-xl border text-center ${
                  d === date
                    ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                    : 'bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)]'
                }`}
              >
                <span className="block text-[10px] font-bold uppercase">{dt.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                <span className="block text-sm font-black">{dd}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className={labelClass}>Time ({prettyDate(date)})</p>
        {times.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)] py-2">No free times on this day. Pick another day.</p>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto">
            {times.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onTime(t)}
                className={`py-2 rounded-xl border text-xs font-bold ${
                  t === time
                    ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                    : 'bg-[var(--card)] border-[var(--border-strong)] text-[var(--foreground)]'
                }`}
              >
                {wallClockTime(t)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  icon: Icon,
  label,
  tone = 'neutral',
  disabled,
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  tone?: 'primary' | 'green' | 'neutral' | 'red';
  disabled?: boolean;
}) {
  const tones = {
    primary: 'bg-[var(--primary)] text-white border-[var(--primary)]',
    green: 'bg-emerald-600 text-white border-emerald-600',
    neutral: 'bg-[var(--card)] text-[var(--foreground)] border-[var(--border-strong)]',
    red: 'bg-[var(--card)] text-rose-600 border-rose-200 dark:border-rose-900',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 hover:brightness-95 ${tones[tone]}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function AppointmentsPage() {
  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bookings, setBookings] = useState<ShopBooking[]>([]);
  const [walkIns, setWalkIns] = useState<ShopBooking[]>([]);
  const [services, setServices] = useState<ShopService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [view, setView] = useState<View>('today');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // New booking
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newServiceId, setNewServiceId] = useState('');
  const [newDate, setNewDate] = useState(todayISO());
  const [newTime, setNewTime] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newError, setNewError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Walk-in
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkServiceId, setWalkServiceId] = useState('');
  const [walkName, setWalkName] = useState('');
  const [walkAmount, setWalkAmount] = useState('');
  const [walkError, setWalkError] = useState<string | null>(null);

  // Per-booking dialogs
  const [payBooking, setPayBooking] = useState<ShopBooking | null>(null);
  const [payDue, setPayDue] = useState<number | null>(null);
  const [payTip, setPayTip] = useState('');
  const [cancelTarget, setCancelTarget] = useState<ShopBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [moveTarget, setMoveTarget] = useState<ShopBooking | null>(null);
  const [moveDate, setMoveDate] = useState(todayISO());
  const [moveTime, setMoveTime] = useState('');

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setBookings(await loadBookings());
    } catch (err: any) {
      setLoadError(err.message || 'Could not load appointments.');
    } finally {
      setIsLoading(false);
    }
    // Walk-ins live in Accounting (owner only); staff simply don't see them here.
    loadWalkIns(addDays(todayISO(), -60), todayISO())
      .then(setWalkIns)
      .catch(() => setWalkIns([]));
  }, []);

  useEffect(() => {
    reload();
    loadServices()
      .then(setServices)
      .catch(() => setServices([]));
  }, [reload]);

  const serviceById = (id: string) => services.find((s) => s.serviceId === id);

  const openNew = useCallback(() => {
    setNewName('');
    setNewPhone('');
    setNewServiceId('');
    setNewDate(todayISO());
    setNewTime('');
    setNewNotes('');
    setNewError(null);
    setShowNew(true);
  }, []);

  const openWalkIn = useCallback(() => {
    setWalkServiceId('');
    setWalkName('');
    setWalkAmount('');
    setWalkError(null);
    setShowWalkIn(true);
  }, []);

  // The top bar's "New booking" / "Walk-in" buttons link here with ?new=booking|walkin.
  // The param is cleared right away so pressing the button again works too.
  useEffect(() => {
    const action = searchParams.get('new');
    if (!action) return;
    if (action === 'walkin') openWalkIn();
    else openNew();
    router.replace('/admin/appointments');
  }, [searchParams, openNew, openWalkIn, router]);

  const run = async (b: ShopBooking, action: () => Promise<unknown>, success: string) => {
    setBusyId(b.bookingId);
    try {
      await action();
      showSuccess('Done', success);
      await reload();
    } catch (err: any) {
      showError('Something went wrong', err.message || 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  // ---------- Save handlers ----------
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const service = serviceById(newServiceId);
    if (newName.trim().length < 2) return setNewError('Enter the customer’s name.');
    if (!isValidPhone(newPhone)) return setNewError(PHONE_ERROR);
    if (!service) return setNewError('Choose a service.');
    if (!newTime) return setNewError('Choose a time.');
    setIsSaving(true);
    setNewError(null);
    try {
      // Re-check against the latest list in case the time was just taken online.
      const latest = await loadBookings();
      const stillFree = freeStartTimes({ date: newDate, durationMinutes: service.durationMinutes, bookings: latest }).includes(newTime);
      if (!stillFree) {
        setBookings(latest);
        setNewTime('');
        throw new Error('That time was just taken. Please pick another time.');
      }
      const customerId = await findOrCreateCustomer(newName.trim(), newPhone);
      const bookingId = await createBooking({ customerId, serviceId: service.serviceId, date: newDate, startTime: newTime, notes: newNotes.trim() });
      // Booked by the shop itself, so it is confirmed straight away (tax added automatically).
      await confirmBooking({ bookingId, servicePrice: service.price });
      setShowNew(false);
      showSuccess('Booked', `${newName.trim()} · ${prettyDate(newDate)} at ${wallClockTime(newTime)}`);
      setView(newDate === todayISO() ? 'today' : 'upcoming');
      setStatusFilter('ACTIVE');
      reload();
    } catch (err: any) {
      setNewError(err.message || 'Could not save the appointment.');
    } finally {
      setIsSaving(false);
    }
  };

  const walkService = serviceById(walkServiceId);
  const walkDue = walkService ? money(walkService.price + taxOn(walkService.price)) : 0;

  const handleWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkService) return setWalkError('Choose the service.');
    const amount = parseFloat(walkAmount);
    if (!(amount > 0)) return setWalkError('Enter the amount the customer paid.');
    setIsSaving(true);
    setWalkError(null);
    try {
      await recordWalkIn({ service: walkService, customerName: walkName, amountPaid: amount });
      setShowWalkIn(false);
      showSuccess('Walk-in saved', `$${formatMoney(amount)} added to today’s income.`);
      setView('today');
      setStatusFilter('ALL');
      reload();
    } catch (err: any) {
      setWalkError(err.message || 'Could not save the walk-in.');
    } finally {
      setIsSaving(false);
    }
  };

  const openPay = async (b: ShopBooking) => {
    setPayBooking(b);
    setPayDue(null);
    setPayTip('');
    try {
      setPayDue((await billFor(b)).totalDue);
    } catch (err: any) {
      setPayBooking(null);
      showError('Could not make the bill', err.message || 'Please try again.');
    }
  };

  const handlePay = async () => {
    if (!payBooking) return;
    const tip = parseFloat(payTip) || 0;
    setIsSaving(true);
    try {
      const paid = await finishAndPay(payBooking, { tip });
      setPayBooking(null);
      showSuccess('Paid', `$${formatMoney(paid + tip)} from ${payBooking.customerName}. All done!`);
      reload();
    } catch (err: any) {
      showError('Payment failed', err.message || 'Please try again.');
      reload();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    const target = cancelTarget;
    setCancelTarget(null);
    await run(target, () => cancelBooking(target.bookingId, cancelReason.trim()), `${target.customerName}'s appointment was cancelled.`);
  };

  const handleMove = async () => {
    if (!moveTarget || !moveTime) return;
    const target = moveTarget;
    setIsSaving(true);
    try {
      await rescheduleBooking(target.bookingId, moveDate, moveTime);
      setMoveTarget(null);
      showSuccess('Time changed', `${target.customerName} · ${prettyDate(moveDate)} at ${wallClockTime(moveTime)}`);
      reload();
    } catch (err: any) {
      showError('Could not change the time', err.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------- List ----------
  const today = todayISO();
  const visible = [...bookings, ...walkIns]
    .filter((b) => (view === 'today' ? b.date === today : view === 'upcoming' ? b.date >= today : true))
    .filter((b) =>
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
          ? ACTIVE_STATUSES.includes(b.status)
          : statusFilter === 'DRAFT'
            ? ['DRAFT', 'LOCKED', 'SCHEDULED'].includes(b.status)
            : b.status === statusFilter
    )
    .filter((b) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return [b.customerName, b.serviceName, b.customerPhone, b.bookingNumber].some((v) => String(v || '').toLowerCase().includes(q));
    })
    .sort((a, b) => (view === 'all' ? String(b.startTime).localeCompare(String(a.startTime)) : String(a.startTime).localeCompare(String(b.startTime))));

  const actionsFor = (b: ShopBooking) => {
    const busy = busyId === b.bookingId;
    const cancel = (
      <ActionButton
        icon={X}
        label="Cancel"
        tone="red"
        disabled={busy}
        onClick={() => {
          setCancelReason('');
          setCancelTarget(b);
        }}
      />
    );
    const changeTime = (
      <ActionButton
        icon={CalendarClock}
        label="Change time"
        disabled={busy}
        onClick={() => {
          setMoveDate(b.date >= today ? b.date : today);
          setMoveTime('');
          setMoveTarget(b);
        }}
      />
    );
    switch (b.status) {
      case 'DRAFT':
      case 'LOCKED':
      case 'SCHEDULED':
        return (
          <>
            <ActionButton
              icon={Check}
              label="Confirm"
              tone="primary"
              disabled={busy}
              onClick={() => {
                const service = serviceById(b.serviceId || '');
                if (!service) return showError('Service not found', 'This service is no longer offered. Cancel and re-book instead.');
                run(b, () => confirmBooking({ bookingId: b.bookingId, servicePrice: service.price }), `Confirmed. ${BUSINESS.taxLabel} ${Math.round(BUSINESS.taxRate * 100)}% added.`);
              }}
            />
            {changeTime}
            {cancel}
          </>
        );
      case 'CONFIRMED':
        return (
          <>
            <ActionButton icon={UserCheck} label="Arrived" tone="primary" disabled={busy} onClick={() => run(b, () => markArrived(b.bookingId), `${b.customerName} has arrived.`)} />
            {changeTime}
            <ActionButton
              icon={UserX}
              label="No-show"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Mark ${b.customerName} as a no-show?`)) run(b, () => markNoShow(b.bookingId), 'Marked as no-show.');
              }}
            />
            {cancel}
          </>
        );
      case 'CHECKED_IN':
        // The backend only allows completing an arrived booking (no cancel / no-show).
        return <ActionButton icon={Banknote} label="Finish & take payment" tone="green" disabled={busy} onClick={() => openPay(b)} />;
      default:
        return null;
    }
  };

  // Unconfirmed bookings still carry the backend's default tax; show what the customer will pay.
  const shownTotal = (b: ShopBooking) => {
    const service = serviceById(b.serviceId || '');
    return ['DRAFT', 'LOCKED', 'SCHEDULED'].includes(b.status) && service ? money(service.price + taxOn(service.price)) : b.total;
  };

  const moveService = moveTarget ? serviceById(moveTarget.serviceId || '') : undefined;
  const newService = serviceById(newServiceId);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Appointments</h1>
        <div className="flex gap-2">
          <button onClick={openWalkIn} className="flex-1 sm:flex-none px-4 py-3 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm">
            <Footprints className="w-4 h-4" /> Walk-in
          </button>
          <button onClick={openNew} className="flex-1 sm:flex-none btn-primary px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> New booking
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-3 rounded-2xl border border-[var(--border)] space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-[var(--muted)] p-1">
            {(
              [
                ['today', 'Today'],
                ['upcoming', 'Upcoming'],
                ['all', 'All'],
              ] as [View, string][]
            ).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold ${view === v ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)]'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]">
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Not finished</option>
            <option value="DRAFT">{STATUS_LABELS.DRAFT} (needs confirming)</option>
            <option value="CONFIRMED">{STATUS_LABELS.CONFIRMED}</option>
            <option value="CHECKED_IN">{STATUS_LABELS.CHECKED_IN}</option>
            <option value="COMPLETED">{STATUS_LABELS.COMPLETED}</option>
            <option value="CANCELLED">{STATUS_LABELS.CANCELLED}</option>
            <option value="NO_SHOW">{STATUS_LABELS.NO_SHOW}</option>
          </select>
          <button onClick={reload} title="Refresh" className="ml-auto p-2 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)]">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone or service" className={`${inputClass} pl-9`} />
        </div>
      </div>

      {/* List */}
      <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
        {isLoading && bookings.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">Loading appointments…</div>
        ) : loadError ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-bold text-rose-600">{loadError}</p>
            <button onClick={reload} className="text-xs font-bold text-[var(--primary)] hover:underline">Try again</button>
          </div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center space-y-1">
            <p className="text-sm font-bold text-[var(--foreground)]">No appointments here</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {view === 'today' ? 'Nothing on today’s list. ' : ''}Try another tab or “All statuses”.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {visible.map((b) => (
              <li key={b.bookingId} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-16 shrink-0 text-center rounded-xl bg-[var(--primary-light)] py-2">
                    <p className="text-sm font-black text-[var(--primary)] leading-tight">{wallClockTime(b.startTime)}</p>
                    {view !== 'today' && <p className="text-[10px] font-bold text-[var(--muted-foreground)] mt-0.5">{prettyDate(b.date)}</p>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-[var(--foreground)]">{b.customerName}</h3>
                      {b.walkIn ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
                          Walk-in · Paid
                        </span>
                      ) : (
                        <Badge variant={b.status} />
                      )}
                    </div>
                    <p className="text-xs font-bold text-[var(--primary)] mt-0.5">{b.serviceName} · ${formatMoney(shownTotal(b))}</p>
                    {b.customerPhone && (
                      <a href={`tel:${b.customerPhone.replace(/\D/g, '')}`} className="text-xs text-[var(--muted-foreground)] hover:underline">
                        {b.customerPhone}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 md:justify-end">{actionsFor(b)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* New booking */}
      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="New booking" maxWidth="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Customer name</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. David Miller" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="tel" inputMode="numeric" value={newPhone} onChange={(e) => setNewPhone(formatPhoneInput(e.target.value))} placeholder={PHONE_PLACEHOLDER} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Service</label>
            <select
              value={newServiceId}
              onChange={(e) => {
                setNewServiceId(e.target.value);
                setNewTime('');
              }}
              className={inputClass}
            >
              <option value="">Choose a service…</option>
              {services.map((s) => (
                <option key={s.serviceId} value={s.serviceId}>
                  {s.name} — ${formatMoney(s.price)}
                </option>
              ))}
            </select>
          </div>
          {newService && (
            <TimePicker bookings={bookings} durationMinutes={newService.durationMinutes} date={newDate} time={newTime} onDate={setNewDate} onTime={setNewTime} />
          )}
          <div>
            <label className={labelClass}>Note (optional)</label>
            <input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="e.g. Low fade" className={inputClass} />
          </div>
          {newService && (
            <p className="text-xs text-[var(--muted-foreground)]">
              Price ${formatMoney(newService.price)} + {BUSINESS.taxLabel} ${formatMoney(taxOn(newService.price))} ={' '}
              <strong className="text-[var(--foreground)]">${formatMoney(newService.price + taxOn(newService.price))}</strong>
            </p>
          )}
          {newError && <p className="text-xs font-bold text-rose-600">{newError}</p>}
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]">Close</button>
            <button type="submit" disabled={isSaving} className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50">
              {isSaving ? 'Saving…' : 'Save booking'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Walk-in */}
      <Modal isOpen={showWalkIn} onClose={() => setShowWalkIn(false)} title="Walk-in customer" maxWidth="sm">
        <form onSubmit={handleWalkIn} className="space-y-4">
          <p className="text-xs text-[var(--muted-foreground)]">For a customer served without a booking. Saves the visit and adds the cash to today’s income.</p>
          <div>
            <label className={labelClass}>Service</label>
            <select
              value={walkServiceId}
              onChange={(e) => {
                setWalkServiceId(e.target.value);
                const s = serviceById(e.target.value);
                setWalkAmount(s ? formatMoney(s.price + taxOn(s.price)) : '');
              }}
              className={inputClass}
            >
              <option value="">Choose a service…</option>
              {services.map((s) => (
                <option key={s.serviceId} value={s.serviceId}>
                  {s.name} — ${formatMoney(s.price)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Amount paid ($)</label>
            <input type="number" inputMode="decimal" step="0.01" min="0" value={walkAmount} onChange={(e) => setWalkAmount(e.target.value)} className={`${inputClass} text-lg font-black`} />
            {walkService && (
              <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                Price ${formatMoney(walkService.price)} + {BUSINESS.taxLabel} ${formatMoney(taxOn(walkService.price))} = ${formatMoney(walkDue)}. Extra counts as a tip.
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Customer name (optional)</label>
            <input value={walkName} onChange={(e) => setWalkName(e.target.value)} placeholder="Walk-in customer" className={inputClass} />
          </div>
          {walkError && <p className="text-xs font-bold text-rose-600">{walkError}</p>}
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button type="button" onClick={() => setShowWalkIn(false)} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]">Close</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
              {isSaving ? 'Saving…' : 'Save & add cash'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Finish & take payment */}
      <Modal isOpen={!!payBooking} onClose={() => setPayBooking(null)} title="Finish & take payment" maxWidth="sm">
        {payBooking && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[var(--muted)]">
              <p className="text-sm font-bold text-[var(--foreground)]">{payBooking.customerName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{payBooking.serviceName}</p>
              <p className="text-3xl font-black text-[var(--foreground)] pt-2">
                {payDue === null ? '…' : `$${formatMoney(payDue)}`} <span className="text-xs font-bold text-[var(--muted-foreground)]">incl. {BUSINESS.taxLabel}</span>
              </p>
            </div>
            <div>
              <label className={labelClass}>Tip (optional, $)</label>
              <input type="number" inputMode="decimal" step="0.01" min="0" value={payTip} onChange={(e) => setPayTip(e.target.value)} placeholder="0.00" className={inputClass} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button type="button" onClick={() => setPayBooking(null)} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]">Close</button>
              <button onClick={handlePay} disabled={isSaving || payDue === null} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
                {isSaving ? 'Saving…' : 'Cash received'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel */}
      <Modal isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel appointment" maxWidth="sm">
        {cancelTarget && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--foreground)]">
              Cancel <strong>{cancelTarget.customerName}</strong>&apos;s {cancelTarget.serviceName} on {prettyDate(cancelTarget.date)} at {wallClockTime(cancelTarget.startTime)}?
            </p>
            <div>
              <label className={labelClass}>Reason (optional)</label>
              <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Customer called" className={inputClass} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button type="button" onClick={() => setCancelTarget(null)} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]">Keep it</button>
              <button onClick={handleCancel} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white">Cancel appointment</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Change time */}
      <Modal isOpen={!!moveTarget} onClose={() => setMoveTarget(null)} title="Change time" maxWidth="md">
        {moveTarget && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--foreground)]">
              <strong>{moveTarget.customerName}</strong> · {moveTarget.serviceName} (now {prettyDate(moveTarget.date)} at {wallClockTime(moveTarget.startTime)})
            </p>
            <TimePicker
              bookings={bookings}
              durationMinutes={moveService?.durationMinutes || 30}
              date={moveDate}
              time={moveTime}
              onDate={setMoveDate}
              onTime={setMoveTime}
              excludeBookingId={moveTarget.bookingId}
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button type="button" onClick={() => setMoveTarget(null)} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]">Close</button>
              <button onClick={handleMove} disabled={!moveTime || isSaving} className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50">
                {isSaving ? 'Saving…' : 'Save new time'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function AdminAppointmentsPage() {
  return (
    <Suspense fallback={null}>
      <AppointmentsPage />
    </Suspense>
  );
}
