'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Calendar, CheckCircle2, Clock, Phone, Scissors } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BUSINESS } from '@/lib/business';
import { formatMoney, wallClockTime } from '@/lib/format';

interface Service {
  serviceId: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  category: string;
}

interface Confirmation {
  bookingNumber: string | null;
  service: string;
  price: number;
  date: string;
  startTime: string;
}

// Shop dates are local calendar dates; build them without time-zone math.
function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function prettyDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, opts);
}
function firstLine(text: string) {
  const line = text.split('\n').map((l) => l.trim()).find(Boolean) || '';
  return line.length > 120 ? `${line.slice(0, 117)}…` : line;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Something went wrong. Please try again.');
  return data as T;
}

export default function BookPage() {
  const { user } = useAuth();

  const [services, setServices] = useState<Service[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [service, setService] = useState<Service | null>(null);
  // The shop's "today" (Fredericton time) comes from the server; the visitor may be elsewhere.
  const [shopToday, setShopToday] = useState(localISO(new Date()));
  const [date, setDate] = useState(localISO(new Date()));
  const [times, setTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  const [timesError, setTimesError] = useState<string | null>(null);
  const [time, setTime] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState(''); // spam trap, hidden from people
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  // Prefill from a signed-in account
  useEffect(() => {
    if (!user) return;
    if (user.name) setName((v) => v || user.name);
    const p = user.phone || user.mobile;
    if (p) setPhone((v) => v || p);
    if (user.email) setEmail((v) => v || user.email || '');
  }, [user]);

  useEffect(() => {
    getJson<{ services: Service[]; today?: string }>('/api/public/booking/services')
      .then(({ services: list, today }) => {
        setServices(list);
        if (today) {
          setShopToday(today);
          setDate(today);
        }
        const wanted = new URLSearchParams(window.location.search).get('serviceId');
        const match = wanted && list.find((s) => s.serviceId === wanted);
        if (match) {
          setService(match);
          setStep(2);
        }
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setIsLoadingServices(false));
  }, []);

  const loadTimes = useCallback(async () => {
    if (!service) return;
    setIsLoadingTimes(true);
    setTimesError(null);
    setTime('');
    try {
      const res = await getJson<{ times: string[] }>(
        `/api/public/booking/slots?serviceId=${service.serviceId}&date=${date}`
      );
      setTimes(res.times);
    } catch (err: any) {
      setTimes([]);
      setTimesError(err.message);
    } finally {
      setIsLoadingTimes(false);
    }
  }, [service, date]);

  useEffect(() => {
    if (step === 2) loadTimes();
  }, [step, loadTimes]);

  const days = useMemo(() => {
    const [y, m, dd] = shopToday.split('-').map(Number);
    const d = new Date(y, m - 1, dd);
    const out: string[] = [];
    for (let i = 0; i < 14; i++) {
      out.push(localISO(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [shopToday]);

  const categories = useMemo(() => Array.from(new Set(services.map((s) => s.category))), [services]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !time) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await getJson<Confirmation>('/api/public/booking', {
        method: 'POST',
        body: JSON.stringify({ serviceId: service.serviceId, date, startTime: time, name, phone, email, notes, website }),
      });
      setConfirmation(result);
    } catch (err: any) {
      setSubmitError(err.message);
      if (/available any more/i.test(err.message)) {
        setStep(2);
        loadTimes();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Confirmation ----------
  if (confirmation) {
    return (
      <div className="max-w-md mx-auto glass-card p-8 rounded-3xl border border-[var(--border)] text-center space-y-4 animate-fade-in">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h1 className="text-xl font-black text-[var(--foreground)]">You&apos;re booked!</h1>
        <div className="p-4 rounded-2xl bg-[var(--muted)] text-left space-y-1">
          <p className="text-sm font-black text-[var(--foreground)]">{confirmation.service}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {prettyDate(confirmation.date)} at {wallClockTime(confirmation.startTime)}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            ${formatMoney(confirmation.price)} {BUSINESS.currency} + tax · pay at the shop
          </p>
          {confirmation.bookingNumber && (
            <p className="text-[11px] text-[var(--muted-foreground)] pt-1">Booking number: {confirmation.bookingNumber}</p>
          )}
        </div>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          See you at {BUSINESS.address.street}. Need to change it? Call us at{' '}
          <a href={`tel:${BUSINESS.phone}`} className="font-bold text-[var(--primary)]">
            {BUSINESS.phoneDisplay}
          </a>
          .
        </p>
        <Link href="/" className="btn-primary inline-flex px-6 py-2.5 rounded-xl text-xs font-bold">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Book an appointment</h1>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          {BUSINESS.name} · {BUSINESS.address.street}
        </p>
      </div>

      {/* Progress */}
      <ol className="flex items-center gap-2 text-[11px] font-bold">
        {['Service', 'Time', 'Your details'].map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                step > i ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
              }`}
            >
              {i + 1}
            </span>
            <span className={step === i + 1 ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}>{label}</span>
            {i < 2 && <span className="w-6 h-px bg-[var(--border-strong)]" />}
          </li>
        ))}
      </ol>

      {/* Step 1: service */}
      {step === 1 && (
        <div className="space-y-4">
          {isLoadingServices ? (
            <div className="glass-card p-10 rounded-2xl text-center text-xs text-[var(--muted-foreground)]">Loading services…</div>
          ) : loadError || services.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center space-y-2 border border-[var(--border)]">
              <p className="text-sm font-bold text-[var(--foreground)]">Online booking isn&apos;t available right now</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Please call us at{' '}
                <a href={`tel:${BUSINESS.phone}`} className="font-bold text-[var(--primary)]">
                  {BUSINESS.phoneDisplay}
                </a>{' '}
                and we&apos;ll book you in.
              </p>
            </div>
          ) : (
            categories.map((cat) => (
              <div key={cat} className="space-y-2">
                {categories.length > 1 && (
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">{cat}</h2>
                )}
                <div className="grid grid-cols-1 gap-2">
                  {services
                    .filter((s) => s.category === cat)
                    .map((s) => (
                      <button
                        key={s.serviceId}
                        onClick={() => {
                          setService(s);
                          setStep(2);
                        }}
                        className="w-full min-w-0 glass-card p-4 rounded-2xl border border-[var(--border)] text-left flex items-center justify-between gap-4 hover:border-[var(--primary)] transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[var(--foreground)]">{s.name}</p>
                          {s.description && (
                            <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{firstLine(s.description)}</p>
                          )}
                          <p className="text-[11px] text-[var(--muted-foreground)] mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {s.durationMinutes} min
                          </p>
                        </div>
                        <span className="text-base font-black text-[var(--primary)] shrink-0">${formatMoney(s.price)}</span>
                      </button>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Step 2: date & time */}
      {step === 2 && service && (
        <div className="glass-card p-5 rounded-2xl border border-[var(--border)] space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Scissors className="w-4 h-4 text-[var(--primary)] shrink-0" />
              <span className="text-sm font-black text-[var(--foreground)] truncate">{service.name}</span>
            </div>
            <button onClick={() => setStep(1)} className="text-xs font-bold text-[var(--primary)] hover:underline shrink-0">
              Change
            </button>
          </div>

          <div>
            <p className="text-xs font-bold text-[var(--foreground)] mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Day
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((d) => (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  className={`shrink-0 w-14 py-2 rounded-xl border text-center transition-colors ${
                    d === date
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                      : 'bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)]'
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase">
                    {prettyDate(d, { weekday: 'short' })}
                  </span>
                  <span className="block text-sm font-black">{Number(d.slice(8))}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-[var(--foreground)] mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Time on {prettyDate(date)}
            </p>
            {isLoadingTimes ? (
              <p className="text-xs text-[var(--muted-foreground)] py-4">Checking available times…</p>
            ) : timesError ? (
              <p className="text-xs text-rose-600 py-4">{timesError}</p>
            ) : times.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] py-4">No times left on this day. Please pick another day.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {times.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTime(t)}
                    className={`py-2 rounded-xl border text-xs font-bold transition-colors ${
                      t === time
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

          {submitError && <p className="text-xs font-bold text-rose-600">{submitError}</p>}

          <div className="flex justify-between pt-2 border-t border-[var(--border)]">
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              onClick={() => {
                setSubmitError(null);
                setStep(3);
              }}
              disabled={!time}
              className="btn-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-50"
            >
              Continue <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: details */}
      {step === 3 && service && (
        <form onSubmit={handleSubmit} className="glass-card p-5 rounded-2xl border border-[var(--border)] space-y-4">
          <div className="p-3 rounded-xl bg-[var(--muted)] text-xs">
            <p className="font-black text-[var(--foreground)]">{service.name}</p>
            <p className="text-[var(--muted-foreground)]">
              {prettyDate(date)} at {wallClockTime(time)} · ${formatMoney(service.price)} + tax · pay at the shop
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Your name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-sm text-[var(--foreground)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Phone</label>
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="(506) 555-1234"
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-sm text-[var(--foreground)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-sm text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Anything we should know? (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
              placeholder="e.g. Low fade, keep the length on top"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-sm text-[var(--foreground)]"
            />
          </div>
          {/* Spam trap: hidden from people, bots fill it in */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="hidden"
            aria-hidden
          />

          {submitError && <p className="text-xs font-bold text-rose-600">{submitError}</p>}

          <div className="flex justify-between pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary px-6 py-2.5 rounded-xl text-xs font-black disabled:opacity-50"
            >
              {isSubmitting ? 'Booking…' : 'Confirm booking'}
            </button>
          </div>
          <p className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1.5">
            <Phone className="w-3 h-3" /> We&apos;ll only use your number about this appointment.
          </p>
        </form>
      )}
    </div>
  );
}
