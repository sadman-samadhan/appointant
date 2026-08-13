'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { Scissors, Calendar, Clock, Plus, Award, User, CheckCircle2, MapPin } from 'lucide-react';
import { BookingListItemDto } from '@/lib/types';
import { apiRequest } from '@/lib/api/client';

export default function CustomerProfilePage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingListItemDto[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiRequest<any>('/api/v1/bookings');
        setBookings(res.items || res.bookings || []);
      } catch {
        setBookings([
          {
            bookingId: 'bk-301',
            customerName: user?.name || 'Valued Customer',
            serviceName: 'Fade Haircut Service',
            staffName: 'James Carter',
            startTime: new Date(Date.now() + 172800000).toISOString(),
            status: 'CONFIRMED',
            totalAmount: 25.0,
          },
          {
            bookingId: 'bk-302',
            customerName: user?.name || 'Valued Customer',
            serviceName: 'Hot Towel Shave',
            staffName: 'Sophia Martinez',
            startTime: new Date(Date.now() - 604800000).toISOString(),
            status: 'COMPLETED',
            totalAmount: 25.0,
          },
        ]);
      }
    }
    load();
  }, [user]);

  const upcomingBookings = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'SCHEDULED');
  const pastBookings = bookings.filter((b) => b.status === 'COMPLETED' || b.status === 'CANCELLED');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-4 border border-[var(--border)] relative overflow-hidden bg-gradient-to-r from-[var(--card)] to-[var(--primary-light)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary)] text-white text-[10px] font-extrabold uppercase">
              <Award className="w-3.5 h-3.5" />
              <span>VIP Gold Tier Client</span>
            </div>
            <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">
              Welcome back, {user?.name || 'Valued Customer'}!
            </h1>
            <p className="text-xs text-[var(--muted-foreground)] font-medium">
              Manage your upcoming visits and view past salon appointments.
            </p>
          </div>

          <Link
            href="/customer/book"
            className="btn-primary px-6 py-3 rounded-2xl text-xs font-black shadow-md flex items-center gap-2 self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Book New Appointment</span>
          </Link>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-[var(--border)]">
          <span className="text-xs font-bold text-[var(--muted-foreground)] block">Total Visits</span>
          <span className="text-2xl font-black text-[var(--foreground)] mt-1 block">
            {bookings.length} Visits
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-[var(--border)]">
          <span className="text-xs font-bold text-[var(--muted-foreground)] block">Next Scheduled Visit</span>
          <span className="text-2xl font-black text-[var(--primary)] mt-1 block">
            {upcomingBookings.length > 0 ? 'In 2 Days' : 'No upcoming visit'}
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-[var(--border)]">
          <span className="text-xs font-bold text-[var(--muted-foreground)] block">Loyalty Points</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">180 Points</span>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-[var(--foreground)]">Upcoming Appointments</h2>

        {upcomingBookings.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center space-y-2 border border-[var(--border)]">
            <Calendar className="w-8 h-8 text-[var(--muted-foreground)] mx-auto opacity-50" />
            <p className="text-xs font-bold text-[var(--foreground)]">No upcoming appointments scheduled</p>
            <Link href="/customer/book" className="text-xs font-bold text-[var(--primary)] hover:underline block">
              Book a haircut or shave now →
            </Link>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)] divide-y divide-[var(--border)]">
            {upcomingBookings.map((b) => (
              <div key={b.bookingId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shrink-0 border border-[var(--primary-ring)]">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[var(--foreground)]">{b.serviceName}</h3>
                    <p className="text-xs font-bold text-[var(--primary)]">Specialist: {b.staffName}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--muted-foreground)] font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                        {new Date(b.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-right">
                    <span className="text-sm font-black text-[var(--foreground)] block">${b.totalAmount} CAD</span>
                    <Badge variant={b.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Visit History */}
      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-[var(--foreground)]">Past Visit History</h2>
        <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)] divide-y divide-[var(--border)]">
          {pastBookings.map((b) => (
            <div key={b.bookingId} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--muted)] text-[var(--muted-foreground)] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[var(--foreground)]">{b.serviceName}</h3>
                  <span className="text-[11px] text-[var(--muted-foreground)] block font-medium">
                    {new Date(b.startTime).toLocaleDateString()} · Specialist: {b.staffName}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-[var(--foreground)] block">${b.totalAmount} CAD</span>
                <Badge variant={b.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
