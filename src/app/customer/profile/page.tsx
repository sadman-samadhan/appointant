'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Scissors, Calendar, CalendarClock, Clock, Plus, CheckCircle2, KeyRound, Phone, Mail, Pencil, User, Eye, EyeOff, X } from 'lucide-react';
import { getStoredToken, refreshAuthToken } from '@/lib/api/client';
import { BUSINESS } from '@/lib/business';
import { formatMoney, bookingLocalDate, wallClockTime } from '@/lib/format';
import { openingHours } from '@/lib/slots';
import { formatPhone, formatPhoneInput, isValidPhone, PHONE_ERROR, PHONE_PLACEHOLDER } from '@/lib/phone';

interface MyBooking {
  bookingId: string;
  bookingNumber: string | null;
  status: string;
  startTime: string;
  totalPrice: string | number;
  currency: string;
  serviceId: string;
  serviceName: string;
  /** Still more than 24 hours away, so the customer may move or cancel it online. */
  canChange: boolean;
}

interface MyDetails {
  name: string;
  phone: string;
  email: string;
}

// The customer's own data comes from /api/account/*, which checks their sign-in token.
async function accountFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const send = () =>
    fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStoredToken() || ''}` },
    });
  let res = await send();
  if (res.status === 401 && (await refreshAuthToken())) res = await send();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Something went wrong. Please try again.');
  return data as T;
}

const ACTIVE = ['DRAFT', 'LOCKED', 'CONFIRMED', 'CHECKED_IN'];
const inputClass =
  'w-full px-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]';

// Shop dates are calendar dates; build them without time-zone math.
function isoOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function prettyDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, opts);
}
/** The next open days (up to two weeks) from the shop's today. */
function openDays(today: string): string[] {
  const [y, m, dd] = today.split('-').map(Number);
  const d = new Date(y, m - 1, dd);
  const out: string[] = [];
  for (let i = 0; i < 14; i++) {
    if (openingHours(isoOf(d))) out.push(isoOf(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function whenText(b: MyBooking, style: 'long' | 'short' = 'long') {
  const d = bookingLocalDate(b);
  if (!d) return '—';
  return style === 'long'
    ? d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CustomerProfilePage() {
  const { user, changePassword } = useAuth();
  const { showSuccess, showError } = useToast();

  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [details, setDetails] = useState<MyDetails | null>(null);

  // Edit details
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Move / cancel an appointment
  const [moveTarget, setMoveTarget] = useState<MyBooking | null>(null);
  const [moveDays, setMoveDays] = useState<string[]>([]);
  const [moveDate, setMoveDate] = useState('');
  const [moveTimes, setMoveTimes] = useState<string[]>([]);
  const [moveTime, setMoveTime] = useState('');
  const [isLoadingMoveTimes, setIsLoadingMoveTimes] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<MyBooking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Change password
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setLoadError(null);
    const [b, d] = await Promise.allSettled([
      accountFetch<{ bookings: MyBooking[] }>('/api/account/bookings'),
      accountFetch<MyDetails>('/api/account/details'),
    ]);
    if (b.status === 'fulfilled') setBookings(b.value.bookings);
    else setLoadError(b.reason?.message || 'Could not load your appointments.');
    if (d.status === 'fulfilled') setDetails(d.value);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // "Change" on the booking form links here with ?edit=details to open the details form.
  const [openDetailsOnLoad, setOpenDetailsOnLoad] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('edit') === 'details') setOpenDetailsOnLoad(true);
  }, []);

  const name = details?.name || user?.name || '';
  const phone = details?.phone || '';
  const email = details?.email || user?.email || '';

  // ---- Details ----
  const openDetails = () => {
    setEditName(name);
    setEditPhone(phone ? formatPhone(phone) : '');
    setDetailsError(null);
    setShowDetailsModal(true);
  };

  useEffect(() => {
    if (!openDetailsOnLoad || isLoading) return;
    setOpenDetailsOnLoad(false);
    openDetails();
    window.history.replaceState(null, '', '/customer/profile');
  });

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim().length < 2) return setDetailsError('Enter your name.');
    if (!isValidPhone(editPhone)) return setDetailsError(PHONE_ERROR);
    setIsSavingDetails(true);
    setDetailsError(null);
    try {
      const saved = await accountFetch<MyDetails>('/api/account/details', {
        method: 'PUT',
        body: JSON.stringify({ name: editName.trim(), phone: editPhone.trim() }),
      });
      setDetails(saved);
      setShowDetailsModal(false);
      showSuccess('Details Saved', 'Your name and phone number are updated.');
    } catch (err: any) {
      setDetailsError(err.message);
    } finally {
      setIsSavingDetails(false);
    }
  };

  // ---- Move / cancel ----
  const openMove = async (b: MyBooking) => {
    setMoveTarget(b);
    setMoveTime('');
    setMoveTimes([]);
    setMoveError(null);
    let today = isoOf(new Date());
    try {
      // The shop's "today" (Fredericton time); the customer may be elsewhere.
      const res = await fetch('/api/public/booking/services').then((r) => r.json());
      if (res?.today) today = res.today;
    } catch {
      /* use the device's date */
    }
    const days = openDays(today);
    setMoveDays(days);
    // Start on the appointment's own day when it is in the list.
    const current = String(b.startTime).slice(0, 10);
    setMoveDate(days.includes(current) ? current : days[0] || today);
  };

  useEffect(() => {
    if (!moveTarget || !moveDate) return;
    let stale = false;
    setIsLoadingMoveTimes(true);
    setMoveTime('');
    accountFetch<{ times: string[] }>(
      `/api/public/booking/slots?serviceId=${moveTarget.serviceId}&date=${moveDate}&exclude=${moveTarget.bookingId}`
    )
      .then((r) => !stale && setMoveTimes(r.times))
      .catch((err) => {
        if (stale) return;
        setMoveTimes([]);
        setMoveError(err.message);
      })
      .finally(() => !stale && setIsLoadingMoveTimes(false));
    return () => {
      stale = true;
    };
  }, [moveTarget, moveDate]);

  const handleMove = async () => {
    if (!moveTarget || !moveTime) return;
    setIsMoving(true);
    setMoveError(null);
    try {
      await accountFetch(`/api/account/bookings/${moveTarget.bookingId}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({ date: moveDate, startTime: moveTime }),
      });
      setMoveTarget(null);
      showSuccess('Appointment moved', `${prettyDate(moveDate)} at ${wallClockTime(moveTime)}`);
      load();
    } catch (err: any) {
      setMoveError(err.message);
    } finally {
      setIsMoving(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      await accountFetch(`/api/account/bookings/${cancelTarget.bookingId}/cancel`, { method: 'POST' });
      setCancelTarget(null);
      showSuccess('Appointment cancelled', cancelTarget.serviceName);
      load();
    } catch (err: any) {
      showError('Could not cancel', err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  // ---- Password: the form always starts empty, and errors show inside the form ----
  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setOldPassword('');
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordError(null);
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 10) return setPasswordError('Your new password must be at least 10 characters.');
    if (newPassword !== confirmNewPassword) return setPasswordError('The two new passwords do not match.');
    if (newPassword === oldPassword) return setPasswordError('Choose a new password that is different from the current one.');
    setIsChangingPass(true);
    setPasswordError(null);
    try {
      await changePassword({ oldPassword, newPassword, confirmPassword: confirmNewPassword });
      closePasswordModal();
      showSuccess('Password Changed', 'Use your new password next time you sign in.');
    } catch (err: any) {
      setPasswordError(err?.message || 'Could not change your password. Check your current password and try again.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const upcoming = bookings
    .filter((b) => ACTIVE.includes(b.status))
    .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  const past = bookings.filter((b) => !ACTIVE.includes(b.status));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-[var(--border)] bg-gradient-to-r from-[var(--card)] to-[var(--primary-light)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Hi, {name || 'there'}!</h1>
            <p className="text-xs text-[var(--muted-foreground)]">Your appointments at {BUSINESS.name}.</p>
          </div>
          <Link
            href="/customer/book"
            className="btn-primary px-5 py-3 rounded-2xl text-sm font-black shadow-md flex items-center justify-center gap-2 self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Book Appointment</span>
          </Link>
        </div>
      </div>

      {/* Upcoming */}
      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-[var(--foreground)]">Upcoming appointments</h2>
        {isLoading ? (
          <div className="glass-card p-8 rounded-2xl text-center text-xs text-[var(--muted-foreground)] border border-[var(--border)]">
            Loading your appointments…
          </div>
        ) : loadError ? (
          <div className="glass-card p-6 rounded-2xl text-center space-y-2 border border-[var(--border)]">
            <p className="text-xs font-bold text-rose-600">{loadError}</p>
            <button onClick={load} className="text-xs font-bold text-[var(--primary)] hover:underline">
              Try again
            </button>
          </div>
        ) : upcoming.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center space-y-2 border border-[var(--border)]">
            <Calendar className="w-8 h-8 text-[var(--muted-foreground)] mx-auto opacity-50" />
            <p className="text-xs font-bold text-[var(--foreground)]">No upcoming appointments</p>
            <Link href="/customer/book" className="text-xs font-bold text-[var(--primary)] hover:underline block">
              Book a haircut or shave now →
            </Link>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)] divide-y divide-[var(--border)]">
            {upcoming.map((b) => (
              <div key={b.bookingId} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shrink-0">
                      <Scissors className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-[var(--foreground)] truncate">{b.serviceName}</h3>
                      <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                        {whenText(b)}
                      </p>
                      {b.bookingNumber && (
                        <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Booking {b.bookingNumber}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <span className="text-sm font-black text-[var(--foreground)] block">${formatMoney(b.totalPrice)}</span>
                    <Badge variant={b.status} />
                  </div>
                </div>
                {b.canChange ? (
                  <div className="flex gap-2 sm:pl-[52px]">
                    <button
                      onClick={() => openMove(b)}
                      className="px-3 py-2 rounded-xl text-xs font-bold border-2 border-[var(--primary)] text-[var(--primary)] bg-[var(--card)] hover:bg-[var(--primary-light)] flex items-center gap-1.5"
                    >
                      <CalendarClock className="w-3.5 h-3.5" /> Reschedule
                    </button>
                    <button
                      onClick={() => setCancelTarget(b)}
                      className="px-3 py-2 rounded-xl text-xs font-bold border border-[var(--border-strong)] text-rose-600 bg-[var(--card)] hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                ) : (
                  ['DRAFT', 'LOCKED', 'CONFIRMED'].includes(b.status) && (
                    <p className="text-[11px] text-[var(--muted-foreground)] sm:pl-[52px]">
                      Less than 24 hours away. To change it, call us at{' '}
                      <a href={`tel:${BUSINESS.phone}`} className="font-bold text-[var(--primary)]">
                        {BUSINESS.phoneDisplay}
                      </a>
                      .
                    </p>
                  )
                )}
              </div>
            ))}
          </div>
        )}
        {upcoming.length > 0 && (
          <p className="text-[11px] text-[var(--muted-foreground)]">
            You can reschedule or cancel up to 24 hours before your appointment. After that, please call us at{' '}
            <a href={`tel:${BUSINESS.phone}`} className="font-bold text-[var(--primary)]">
              {BUSINESS.phoneDisplay}
            </a>
            .
          </p>
        )}
      </section>

      {/* My details */}
      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-[var(--foreground)]">My details</h2>
        <div className="glass-card p-5 rounded-2xl border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 text-sm text-[var(--foreground)] min-w-0">
            <p className="flex items-center gap-2 font-bold">
              <User className="w-4 h-4 text-[var(--primary)] shrink-0" />
              {name || '—'}
            </p>
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[var(--primary)] shrink-0" />
              {phone ? formatPhone(phone) : <span className="text-[var(--muted-foreground)]">No phone number yet</span>}
            </p>
            <p className="flex items-center gap-2 truncate">
              <Mail className="w-4 h-4 text-[var(--primary)] shrink-0" />
              {email}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={openDetails}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--border)] flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5 text-[var(--primary)]" />
              Edit details
            </button>
            <button
              onClick={() => {
                closePasswordModal();
                setShowPasswordModal(true);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--border)] flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-[var(--primary)]" />
              Change password
            </button>
          </div>
        </div>
      </section>

      {/* Past */}
      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-[var(--foreground)]">Past visits</h2>
        {past.length === 0 ? (
          <div className="glass-card p-6 rounded-2xl text-center border border-[var(--border)]">
            <p className="text-xs text-[var(--muted-foreground)]">No past visits yet.</p>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)] divide-y divide-[var(--border)]">
            {past.map((b) => (
              <div key={b.bookingId} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-xs font-black text-[var(--foreground)] truncate">{b.serviceName}</h3>
                    <span className="text-[11px] text-[var(--muted-foreground)]">{whenText(b, 'short')}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <span className="text-xs font-black text-[var(--foreground)] block">${formatMoney(b.totalPrice)}</span>
                  <Badge variant={b.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Edit details modal */}
      <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Edit my details" maxWidth="sm">
        <form onSubmit={handleSaveDetails} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Name</label>
            <input
              required
              value={editName}
              onChange={(e) => {
                setEditName(e.target.value);
                setDetailsError(null);
              }}
              autoComplete="name"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Phone</label>
            <input
              type="tel"
              required
              value={editPhone}
              onChange={(e) => {
                setEditPhone(formatPhoneInput(e.target.value));
                setDetailsError(null);
              }}
              onBlur={() => isValidPhone(editPhone) && setEditPhone(formatPhone(editPhone))}
              placeholder={PHONE_PLACEHOLDER}
              autoComplete="tel-national"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Email</label>
            <input value={email} disabled className={`${inputClass} opacity-60`} />
            <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
              This is the email you sign in with. To change it, call us at {BUSINESS.phoneDisplay}.
            </p>
          </div>
          {detailsError && <p className="text-xs font-bold text-rose-600">{detailsError}</p>}
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowDetailsModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button type="submit" disabled={isSavingDetails} className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50">
              {isSavingDetails ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reschedule modal */}
      <Modal isOpen={!!moveTarget} onClose={() => setMoveTarget(null)} title="Reschedule" maxWidth="md">
        {moveTarget && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-[var(--muted)] text-xs">
              <p className="font-black text-[var(--foreground)]">{moveTarget.serviceName}</p>
              <p className="text-[var(--muted-foreground)]">Now: {whenText(moveTarget)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--foreground)] mb-2">New day</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {moveDays.map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setMoveDate(d);
                      setMoveError(null);
                    }}
                    className={`shrink-0 w-14 py-2 rounded-xl border text-center transition-colors ${
                      d === moveDate
                        ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                        : 'bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)]'
                    }`}
                  >
                    <span className="block text-[10px] font-bold uppercase">{prettyDate(d, { weekday: 'short' })}</span>
                    <span className="block text-sm font-black">{Number(d.slice(8))}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--foreground)] mb-2">New time on {moveDate && prettyDate(moveDate)}</p>
              {isLoadingMoveTimes ? (
                <p className="text-xs text-[var(--muted-foreground)] py-3">Checking available times…</p>
              ) : moveTimes.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)] py-3">No times left on this day. Please pick another day.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {moveTimes.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setMoveTime(t);
                        setMoveError(null);
                      }}
                      className={`py-2 rounded-xl border text-xs font-bold transition-colors ${
                        t === moveTime
                          ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                          : 'bg-[var(--card)] border-[var(--border-strong)] text-[var(--foreground)] hover:border-[var(--primary)]'
                      }`}
                    >
                      {wallClockTime(t)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {moveError && <p className="text-xs font-bold text-rose-600">{moveError}</p>}
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button onClick={() => setMoveTarget(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]">
                Keep current time
              </button>
              <button
                onClick={handleMove}
                disabled={!moveTime || isMoving}
                className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {isMoving ? 'Saving…' : 'Move appointment'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel modal */}
      <Modal isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel appointment?" maxWidth="sm">
        {cancelTarget && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-[var(--muted)] text-xs">
              <p className="font-black text-[var(--foreground)]">{cancelTarget.serviceName}</p>
              <p className="text-[var(--muted-foreground)]">{whenText(cancelTarget)}</p>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button onClick={() => setCancelTarget(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]">
                Keep it
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling…' : 'Yes, cancel it'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Change password modal */}
      <Modal isOpen={showPasswordModal} onClose={closePasswordModal} title="Change password" maxWidth="sm">
        <form onSubmit={handleChangePasswordSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Current password</label>
            <div className="relative">
              <input
                type={showOldPassword ? 'text' : 'password'}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                autoComplete="current-password"
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowOldPassword((v) => !v)}
                aria-label={showOldPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 w-10 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">New password</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 w-10 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Confirm new password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                autoComplete="new-password"
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 w-10 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {passwordError && (
            <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs font-bold text-rose-700">
              {passwordError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button type="button" onClick={closePasswordModal} className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]">
              Cancel
            </button>
            <button type="submit" disabled={isChangingPass} className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50">
              {isChangingPass ? 'Saving…' : 'Change password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
