'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { formatMoney, todayISO, wallClockTime } from '@/lib/format';
import { listEntries } from '@/lib/moneyBook';
import { ACTIVE_STATUSES, ShopBooking, loadBookings } from '@/lib/shopBookings';
import { ArrowRight, CalendarDays, Footprints, Plus, RefreshCw, TrendingUp, Wallet } from 'lucide-react';

function Tile({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ElementType; tone: string }) {
  return (
    <div className="glass-card p-5 rounded-2xl border border-[var(--border)] flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tone}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-[var(--muted-foreground)]">{label}</p>
        <p className="text-2xl font-black text-[var(--foreground)] truncate">{value}</p>
      </div>
    </div>
  );
}

export default function TodayPage() {
  const { user, isAdmin } = useAuth();
  const [bookings, setBookings] = useState<ShopBooking[]>([]);
  const [moneyToday, setMoneyToday] = useState<number | null>(null);
  const [profitMonth, setProfitMonth] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = todayISO();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setBookings(await loadBookings());
    } catch (err: any) {
      setError(err.message || 'Could not load today’s appointments.');
    }
    if (isAdmin) {
      try {
        const entries = await listEntries(`${today.slice(0, 8)}01`, today);
        // Profit is before HST: the HST collected is owed to the CRA.
        const sum = (list: typeof entries) => list.reduce((s, e) => s + (e.type === 'IN' ? 1 : -1) * (e.amount - e.tax), 0);
        setMoneyToday(entries.filter((e) => e.date === today && e.type === 'IN').reduce((s, e) => s + e.amount, 0));
        setProfitMonth(sum(entries));
      } catch {
        setMoneyToday(null);
        setProfitMonth(null);
      }
    }
    setIsLoading(false);
  }, [isAdmin, today]);

  useEffect(() => {
    load();
  }, [load]);

  const todays = bookings
    .filter((b) => b.date === today && b.status !== 'CANCELLED')
    .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  const stillToCome = todays.filter((b) => ACTIVE_STATUSES.includes(b.status));

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">
            {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={load} title="Refresh" className="p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)]">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Big actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/admin/appointments?new=booking" className="btn-primary p-5 rounded-2xl flex flex-col items-start gap-2 shadow-md">
          <Plus className="w-7 h-7" />
          <span className="text-base font-black">New booking</span>
        </Link>
        <Link href="/admin/appointments?new=walkin" className="p-5 rounded-2xl flex flex-col items-start gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white">
          <Footprints className="w-7 h-7" />
          <span className="text-base font-black">Walk-in</span>
        </Link>
      </div>

      {/* Numbers */}
      <div className={`grid grid-cols-1 gap-3 ${isAdmin ? 'sm:grid-cols-3' : ''}`}>
        <Tile label="Appointments today" value={String(todays.length)} icon={CalendarDays} tone="bg-[var(--primary-light)] text-[var(--primary)]" />
        {isAdmin && (
          <>
            <Tile
              label="Money in today"
              value={moneyToday === null ? '—' : `$${formatMoney(moneyToday)}`}
              icon={Wallet}
              tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
            />
            <Tile
              label="Profit this month"
              value={profitMonth === null ? '—' : `${profitMonth < 0 ? '-' : ''}$${formatMoney(Math.abs(profitMonth))}`}
              icon={TrendingUp}
              tone="bg-blue-50 text-blue-600 dark:bg-blue-950/40"
            />
          </>
        )}
      </div>

      {/* Today's list */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[var(--foreground)]">Today’s appointments</h2>
          <Link href="/admin/appointments" className="text-xs font-bold text-[var(--primary)] flex items-center gap-1">
            Open list <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
          {isLoading && bookings.length === 0 ? (
            <p className="p-8 text-center text-xs text-[var(--muted-foreground)]">Loading…</p>
          ) : error ? (
            <p className="p-8 text-center text-sm font-bold text-rose-600">{error}</p>
          ) : todays.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--muted-foreground)]">No appointments today.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {todays.map((b) => (
                <li key={b.bookingId}>
                  <Link href="/admin/appointments" className="p-4 flex items-center justify-between gap-3 hover:bg-[var(--muted)]/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-16 shrink-0 text-center text-sm font-black text-[var(--primary)]">{wallClockTime(b.startTime)}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--foreground)] truncate">{b.customerName}</p>
                        <p className="text-xs text-[var(--muted-foreground)] truncate">{b.serviceName}</p>
                      </div>
                    </div>
                    <Badge variant={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {stillToCome.length > 0 && (
          <p className="text-xs text-[var(--muted-foreground)]">{stillToCome.length} still to finish today.</p>
        )}
      </section>
    </div>
  );
}
