'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiRequest, generateIdempotencyKey } from '@/lib/api/client';
import { KPICard } from '@/components/ui/KPICard';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_TENANT_ID } from '@/lib/api/config';
import {
  CalendarDays,
  DollarSign,
  Users,
  Receipt,
  Plus,
  Wallet,
  Scissors,
  Clock,
  CheckCircle2,
  XCircle,
  UserCheck,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { BookingListItemDto, StaffResponseDto, InvoiceDto, PaymentResponseDto } from '@/lib/types';

export default function AdminDashboardPage() {
  const { showSuccess, showError } = useToast();
  const { isAdmin, user } = useAuth();

  const [bookings, setBookings] = useState<BookingListItemDto[]>([]);
  const [staffList, setStaffList] = useState<StaffResponseDto[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [payments, setPayments] = useState<PaymentResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Quick Cash Payment Modal from Dashboard
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState('25.00');
  const [cashCustomer, setCashCustomer] = useState('');
  const [cashNotes, setCashNotes] = useState('Front desk cash settlement');
  const [isSubmittingCash, setIsSubmittingCash] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);

    try {
      const bkRes = await apiRequest<any>('/api/v1/bookings');
      const bList = bkRes.items || bkRes.bookings || bkRes || [];
      if (Array.isArray(bList)) {
        setBookings(
          bList.map((b: any) => ({
            bookingId: b.bookingId || b.id,
            customerName: b.customerName || b.customer?.fullName || 'Client',
            serviceName: b.serviceName || b.service?.name || 'Salon Service',
            staffName: b.staffName || b.staff?.fullName,
            startTime: b.startTime || b.date,
            status: b.status || 'SCHEDULED',
            totalAmount: Number(b.totalAmount ?? b.service?.basePrice ?? 25),
            currency: b.currency || 'CAD',
          }))
        );
      }
    } catch {
      setBookings([]);
    }

    try {
      const stfRes = await apiRequest<any>(`/api/v1/staff?tenantId=${DEFAULT_TENANT_ID}`);
      const sList = stfRes.items || stfRes.staff || stfRes.data || (Array.isArray(stfRes) ? stfRes : []);
      if (Array.isArray(sList)) {
        setStaffList(
          sList.map((s: any) => ({
            staffId: s.staffId || s.id,
            fullName: s.fullName || s.name || 'Specialist',
            roleTitle: s.roleTitle || s.role || 'Specialist',
            email: s.email || '',
            phone: s.phone,
            employmentType: s.employmentType || 'FULL_TIME',
            status: s.status || 'ACTIVE',
          }))
        );
      }
    } catch {
      setStaffList([]);
    }

    if (isAdmin) {
      try {
        const invRes = await apiRequest<any>('/api/v1/billing/invoices');
        const iList = invRes.items || invRes.invoices || invRes || [];
        if (Array.isArray(iList)) setInvoices(iList);
      } catch {
        setInvoices([]);
      }

      try {
        const payRes = await apiRequest<any>('/api/v1/payments');
        const pList = payRes.items || payRes.payments || payRes || [];
        if (Array.isArray(pList)) setPayments(pList);
      } catch {
        setPayments([]);
      }
    }

    setIsLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleStatusUpdate = async (bookingId: string, action: 'confirm' | 'checkin' | 'complete' | 'cancel') => {
    try {
      await apiRequest(`/api/v1/bookings/${bookingId}/${action}`, {
        method: 'POST',
        body: action === 'cancel' ? JSON.stringify({ reason: 'Admin dashboard trigger' }) : JSON.stringify({}),
      });
      showSuccess('Status Updated', `Booking status changed to ${action.toUpperCase()}`);
      fetchDashboardData();
    } catch (err: any) {
      showError('Action Failed', err.message || `Failed to ${action} booking`);
    }
  };

  const handleRecordQuickCash = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCash(true);
    try {
      await apiRequest('/api/v1/payments', {
        method: 'POST',
        body: JSON.stringify({
          customerId: 'cust-walkin',
          amount: parseFloat(cashAmount),
          currency: 'CAD',
          paymentMethod: 'CASH',
          paymentDate: new Date().toISOString().split('T')[0],
          idempotencyKey: generateIdempotencyKey(),
          notes: `${cashCustomer ? `Client: ${cashCustomer} · ` : ''}${cashNotes}`,
        }),
      });
      showSuccess('Cash Registered', `$${cashAmount} CAD cash entry recorded.`);
      setShowCashModal(false);
      setCashCustomer('');
      fetchDashboardData();
    } catch (err: any) {
      showError('Payment Failed', err.message || 'Could not record cash payment');
    } finally {
      setIsSubmittingCash(false);
    }
  };

  // KPI Calculations from Live Backend Data
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRevenue = payments
    .filter((p) => p.createdAt?.startsWith(todayStr) || true)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const pendingInvoicesCount = invoices.filter((i) => i.status === 'UNPAID' || i.status === 'PARTIAL').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Dashboard Overview</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Real-time daily metrics & appointment queue for B Diamond Beauty Salon.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)]"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCashModal(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Quick Cash Pay</span>
          </button>
          <Link
            href="/admin/appointments"
            className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Booking</span>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Revenue Recorded"
          value={`$${todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} CAD`}
          sub="100% Cash Entry (Phase 1)"
          icon={DollarSign}
          accentColor="text-emerald-600 dark:text-emerald-400"
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/40"
        />

        <KPICard
          label="Total Appointments"
          value={bookings.length}
          sub="Appointments on ledger"
          icon={CalendarDays}
          accentColor="text-[var(--primary)]"
          iconBgColor="bg-[var(--primary-light)]"
        />

        <KPICard
          label="Specialists On Roster"
          value={staffList.length}
          sub="Downtown Main Branch"
          icon={Users}
          accentColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-50 dark:bg-blue-950/40"
        />

        <KPICard
          label="Pending Invoices"
          value={pendingInvoicesCount}
          sub="Awaiting cash settlement"
          icon={Receipt}
          accentColor="text-amber-600 dark:text-amber-400"
          iconBgColor="bg-amber-50 dark:bg-amber-950/40"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Appointments List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[var(--foreground)]">Today&apos;s Appointments</h2>
            <Link
              href="/admin/appointments"
              className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
            >
              <span>View Full Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-[var(--border)] border border-[var(--border)]">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">Loading appointments...</div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CalendarDays className="w-8 h-8 text-[var(--muted-foreground)] mx-auto opacity-50" />
                <p className="text-xs font-bold text-[var(--foreground)]">No appointments scheduled</p>
                <p className="text-[11px] text-[var(--muted-foreground)]">New customer bookings will appear here in real-time.</p>
              </div>
            ) : (
              bookings.slice(0, 6).map((apt) => (
                <div
                  key={apt.bookingId}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--muted)]/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shrink-0 border border-[var(--primary-ring)]">
                      <Scissors className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-[var(--foreground)]">{apt.customerName}</h3>
                      <p className="text-xs font-semibold text-[var(--primary)]">{apt.serviceName}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--muted-foreground)] font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[var(--muted-foreground)]" />
                          {new Date(apt.startTime).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>· Specialist: {apt.staffName || 'Any Specialist'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
                    <div className="text-right">
                      <span className="text-sm font-black text-[var(--foreground)] block">
                        ${apt.totalAmount} {apt.currency || 'CAD'}
                      </span>
                      <Badge variant={apt.status} />
                    </div>

                    {/* Quick Action Triggers */}
                    <div className="flex items-center gap-1">
                      {apt.status === 'SCHEDULED' && (
                        <button
                          onClick={() => handleStatusUpdate(apt.bookingId, 'confirm')}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                          title="Confirm Booking"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}

                      {(apt.status === 'CONFIRMED' || apt.status === 'SCHEDULED') && (
                        <button
                          onClick={() => handleStatusUpdate(apt.bookingId, 'checkin')}
                          className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50"
                          title="Check In Customer"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}

                      {apt.status === 'CHECKED_IN' && (
                        <button
                          onClick={() => handleStatusUpdate(apt.bookingId, 'complete')}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                          title="Complete Appointment"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}

                      {apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleStatusUpdate(apt.bookingId, 'cancel')}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                          title="Cancel Appointment"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Side Cash Register Overview */}
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-[var(--foreground)]">Cash Terminal & Actions</h2>

          <div className="glass-card p-5 rounded-2xl space-y-4 border-l-4 border-l-emerald-600 border border-[var(--border)]">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
              <Wallet className="w-5 h-5 text-emerald-600" />
              <span>Phase 1 Cash Register</span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed font-medium">
              In-person cash settlement interface. Recorded payments post directly to General Ledger accounts.
            </p>
            <div className="p-3 rounded-xl bg-[var(--muted)] space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--muted-foreground)] block">
                Total Cash Receipts
              </span>
              <span className="text-xl font-black text-emerald-600 block">
                ${todayRevenue.toFixed(2)} CAD
              </span>
            </div>

            <button
              onClick={() => setShowCashModal(true)}
              className="w-full py-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Open Cash Register Entry</span>
            </button>
          </div>

          <div className="glass-card p-5 rounded-2xl space-y-3 border border-[var(--border)]">
            <h3 className="text-xs font-black text-[var(--foreground)] uppercase tracking-wider">Quick Links</h3>
            <div className="space-y-2 text-xs font-bold">
              <Link
                href="/admin/invoices"
                className="p-2.5 rounded-xl bg-[var(--muted)] hover:bg-[var(--border)] transition-colors flex items-center justify-between"
              >
                <span>Invoices Ledger</span>
                <span className="text-amber-600">{pendingInvoicesCount} Pending</span>
              </Link>
              <Link
                href="/admin/services"
                className="p-2.5 rounded-xl bg-[var(--muted)] hover:bg-[var(--border)] transition-colors flex items-center justify-between"
              >
                <span>Services & Addons</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/admin/staff"
                className="p-2.5 rounded-xl bg-[var(--muted)] hover:bg-[var(--border)] transition-colors flex items-center justify-between"
              >
                <span>Staff Shifts & Hours</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Cash Payment Modal */}
      <Modal
        isOpen={showCashModal}
        onClose={() => setShowCashModal(false)}
        title="Record Cash Payment"
        maxWidth="sm"
      >
        <form onSubmit={handleRecordQuickCash} className="space-y-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Enforced Cash Register Payment Entry</span>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Cash Amount (CAD $)</label>
            <input
              type="number"
              step="0.01"
              required
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-sm font-bold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Customer / Reference Name</label>
            <input
              type="text"
              placeholder="e.g. Walk-in Client"
              value={cashCustomer}
              onChange={(e) => setCashCustomer(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Payment Notes</label>
            <input
              type="text"
              value={cashNotes}
              onChange={(e) => setCashNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowCashModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingCash}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmittingCash ? 'Recording...' : 'Confirm Cash Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
