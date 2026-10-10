'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest, generateIdempotencyKey } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID } from '@/lib/api/config';
import {
  formatMoney,
  servicePrice,
  serviceDuration,
  toList,
  toNumber,
  todayISO,
  wallClockDate,
  wallClockTime,
} from '@/lib/format';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  UserCheck,
  Ban,
  Receipt,
  CalendarCheck2,
  Wallet,
  CalendarDays,
  Sparkles,
  Banknote,
} from 'lucide-react';
import {
  BookingListItemDto,
  BookingStatus,
  ServiceDto,
  StaffResponseDto,
  CustomerDto,
} from '@/lib/types';

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function bookingDateOf(b: any): string {
  return wallClockDate(b.date || b.bookingDate || b.startTime);
}

// An appointment's journey, in the words the shop uses.
const STEPS = ['Booked', 'Confirmed', 'Arrived', 'Done', 'Paid'] as const;

function stepOf(status: string, billed: boolean): number {
  switch (status) {
    case 'COMPLETED':
      return 4; // the backend completes a booking only once its bill is paid
    case 'CHECKED_IN':
      return billed ? 3 : 2;
    case 'CONFIRMED':
      return 1;
    default:
      return 0; // DRAFT / LOCKED / SCHEDULED
  }
}

interface InvoiceRef {
  invoiceId: string;
  status: string;
  balanceDue: number;
  customerId?: string;
}

function customerPhoneOf(c: any): string {
  const contacts: any[] = c?.customer?.contacts || c?.contacts || [];
  return contacts.find((ct) => ct.type === 'PHONE')?.value || c?.phone || '';
}

export default function AdminAppointmentsPage() {
  const { showSuccess, showError } = useToast();

  const [bookings, setBookings] = useState<BookingListItemDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [staffList, setStaffList] = useState<StaffResponseDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal & Action Triggers
  const [selectedBooking, setSelectedBooking] = useState<BookingListItemDto | null>(null);

  // New Booking Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('+1 (506) ');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [bookingDate, setBookingDate] = useState(todayISO());
  const [bookingTime, setBookingTime] = useState('10:00:00');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [bookingSuccessNotice, setBookingSuccessNotice] = useState<string | null>(null);

  // Action Modals: Cancel, Reschedule, Confirm, Draft Invoice
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Client requested cancellation');

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(todayISO());
  const [rescheduleTime, setRescheduleTime] = useState('11:00:00');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [vatTaxAmount, setVatTaxAmount] = useState('0.00');
  const [tipAmount, setTipAmount] = useState('0.00');
  const [discountAmount, setDiscountAmount] = useState('0.00');

  const [isActionLoading, setIsActionLoading] = useState(false);

  // Invoices by bookingId, to know which appointments are paid
  const [invoiceByBooking, setInvoiceByBooking] = useState<Record<string, InvoiceRef>>({});
  const [paymentBooking, setPaymentBooking] = useState<BookingListItemDto | null>(null);
  const [isTakingPayment, setIsTakingPayment] = useState(false);

  const resetForm = useCallback(() => {
    setNewCustName('');
    setNewCustPhone('+1 (506) ');
    setNewCustEmail('');
    setBookingNotes('');
    setBookingDate(todayISO());
    setBookingTime('10:00:00');
    setBookingSuccessNotice(null);
    if (services.length > 0) {
      setSelectedServiceId(services[0].serviceId || (services[0] as any).id);
    }
    setSelectedStaffId('');
  }, [services]);

  const handleOpenWalkIn = useCallback(() => {
    setNewCustName('Walk-in Customer');
    setNewCustPhone('+1 (506) 883-2222');
    setNewCustEmail('');
    setBookingNotes('Walk-in customer at front desk');
    setBookingDate(todayISO());
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    setBookingTime(`${currentHour}:00:00`);
    if (services.length > 0) {
      setSelectedServiceId(services[0].serviceId || (services[0] as any).id);
    }
    setBookingSuccessNotice(null);
    setShowCreateModal(true);
  }, [services]);

  const loadDependencies = useCallback(async () => {
    try {
      const srvRes = await apiRequest<any>(`/api/v1/services/branches/${DEFAULT_BRANCH_ID}`);
      // Backend sends basePrice/baseDurationMinutes as strings; normalize once here.
      const srvList: ServiceDto[] = toList(srvRes, 'services').map((s: any) => ({
        ...s,
        serviceId: s.serviceId || s.id,
        name: s.name || 'Service',
        price: servicePrice(s),
        durationMinutes: serviceDuration(s),
      }));
      const usable = srvList.filter((s) => !['ARCHIVED', 'INACTIVE', 'DISCONTINUED'].includes(String(s.status)));
      const activeOnly = usable.filter((s) => s.status === 'ACTIVE' || (s as any).isActive === true);
      const effective = activeOnly.length > 0 ? activeOnly : usable;
      setServices(effective);
      if (effective.length > 0) {
        setSelectedServiceId(effective[0].serviceId);
      }
    } catch {
      setServices([]);
    }

    try {
      const stfRes = await apiRequest<any>(`/api/v1/staff?tenantId=${DEFAULT_TENANT_ID}`);
      const stfList = toList(stfRes, 'staff').filter((s: any) => !s.status || s.status === 'ACTIVE');
      {
        const normalized: StaffResponseDto[] = stfList.map((s: any) => ({
          staffId: s.staffId || s.id,
          fullName: s.fullName || s.name || 'Specialist',
          email: s.email,
          phone: s.phone,
          employmentType: s.employmentType || 'FULL_TIME',
          roleTitle: s.roleTitle || s.role || 'Stylist',
          status: s.status || 'ACTIVE',
        }));
        setStaffList(normalized);
      }
    } catch {
      setStaffList([]);
    }

    try {
      const custRes = await apiRequest<any>(`/api/v1/tenants/${DEFAULT_TENANT_ID}/customers`);
      setCustomers(toList(custRes, 'customers'));
    } catch {
      setCustomers([]);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<any>('/api/v1/bookings');
      const list: any[] = toList(res, 'bookings');
      setBookings(
        list
          .filter((b: any) => b.bookingId || b.id)
          .map((b: any) => ({
            bookingId: String(b.bookingId || b.id),
            customerId: b.customer?.id || b.customerId,
            customerName: b.customer?.name || b.customerName || b.customer?.fullName || 'Customer',
            customerPhone: b.customer?.phone,
            serviceId: b.serviceDetails?.id || b.serviceId,
            serviceName: b.serviceDetails?.name || b.serviceName || b.service?.name || 'Service',
            staffId: b.staff?.id || b.staffId,
            staffName: b.staff?.name || b.staffName || b.staff?.fullName,
            date: bookingDateOf(b),
            startTime: b.startTime,
            endTime: b.endTime,
            status: (b.status || 'SCHEDULED') as BookingStatus,
            totalAmount: toNumber(b.totalPrice ?? b.totalAmount ?? b.finalAmount ?? b.serviceDetails?.basePrice),
            currency: b.currency || 'CAD',
            notes: b.notes,
          }))
      );
    } catch {
      setBookings([]);
    } finally {
      setIsLoading(false);
    }

    // Invoice items carry the bookingId they bill for.
    try {
      const invRes = await apiRequest<any>('/api/v1/billing/invoices');
      const map: Record<string, InvoiceRef> = {};
      for (const inv of toList<any>(invRes, 'invoices')) {
        if (['VOID', 'CANCELLED'].includes(inv.status)) continue;
        for (const item of inv.items || []) {
          if (!item?.bookingId) continue;
          map[item.bookingId] = {
            invoiceId: inv.invoiceId,
            status: inv.status,
            balanceDue: toNumber(inv.balanceDue),
            customerId: inv.customerId,
          };
        }
      }
      setInvoiceByBooking(map);
    } catch {
      setInvoiceByBooking({});
    }
  }, []);

  useEffect(() => {
    loadDependencies();
    loadBookings();
  }, [loadDependencies, loadBookings]);

  // Handle URL query parameters (?walkIn=true, ?newBooking=true)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('walkIn') === 'true') {
        handleOpenWalkIn();
      } else if (params.get('newBooking') === 'true') {
        setShowCreateModal(true);
      }
    }
  }, [handleOpenWalkIn]);

  // Handle Create Booking
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      showError('Name Required', 'Please enter customer full name.');
      return;
    }
    if (!selectedServiceId) {
      showError('Service Required', 'Please select an active service offering.');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      // 1. Reuse an existing salon customer with the same phone, otherwise create one.
      const phoneDigits = digitsOnly(newCustPhone);
      const existing: any =
        phoneDigits.length >= 7
          ? customers.find((c: any) => digitsOnly(customerPhoneOf(c)) === phoneDigits)
          : undefined;
      let customerId: string | undefined = existing?.customerId || existing?.customer?.customerId;

      if (!customerId) {
        const cRes = await apiRequest<any>('/api/v1/customers', {
          method: 'POST',
          body: JSON.stringify({
            fullName: newCustName.trim(),
            contacts: [
              ...(phoneDigits.length >= 7 ? [{ type: 'PHONE', value: newCustPhone.trim(), isPrimary: true }] : []),
              ...(newCustEmail.trim()
                ? [{ type: 'EMAIL', value: newCustEmail.trim(), isPrimary: phoneDigits.length < 7 }]
                : []),
            ],
          }),
        });
        customerId = cRes?.customerId || cRes?.id || cRes?.customer?.customerId;
        if (!customerId) {
          throw new Error('The customer record could not be created. Please check the name and phone number.');
        }
        await apiRequest(`/api/v1/tenants/${DEFAULT_TENANT_ID}/customers`, {
          method: 'POST',
          body: JSON.stringify({ customerId, preferredBranchId: DEFAULT_BRANCH_ID }),
        }).catch(() => {
          /* already linked to this salon */
        });
      }

      // 2. Submit Booking
      const bookingRes = await apiRequest<any>('/api/v1/bookings', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: DEFAULT_TENANT_ID,
          branchId: DEFAULT_BRANCH_ID,
          customerId,
          serviceId: selectedServiceId,
          staffId: selectedStaffId || undefined,
          date: bookingDate,
          startTime:
            bookingTime.includes(':') && bookingTime.split(':').length === 2 ? `${bookingTime}:00` : bookingTime,
          notes: bookingNotes.trim() || undefined,
        }),
      });

      if (!(bookingRes?.bookingId || bookingRes?.id)) {
        throw new Error('The appointment was not saved. Please try again.');
      }

      // Display success message, then close and reset
      setBookingSuccessNotice(`Appointment booked for ${newCustName}! Confirm it when you're ready.`);
      showSuccess('Booking Created', `Appointment saved for ${newCustName}`);

      setTimeout(() => {
        setShowCreateModal(false);
        resetForm();
      }, 900);

      loadBookings();
    } catch (err: any) {
      showError('Creation Failed', err.message || 'Could not create appointment');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Workflow Actions
  const handleConfirmSubmit = async () => {
    if (!selectedBooking) return;
    setIsActionLoading(true);
    try {
      await apiRequest(`/api/v1/bookings/${selectedBooking.bookingId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          vatAmount: parseFloat(vatTaxAmount) || 0,
          tipAmount: parseFloat(tipAmount) || 0,
          discountAmount: parseFloat(discountAmount) || 0,
          note: 'Confirmed from admin calendar',
        }),
      });
      showSuccess('Booking Confirmed', `Appointment #${selectedBooking.bookingId} confirmed.`);
      setShowConfirmModal(false);
      setSelectedBooking(null);
      loadBookings();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Could not confirm booking');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCheckin = async (bookingId: string) => {
    try {
      await apiRequest(`/api/v1/bookings/${bookingId}/checkin`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      showSuccess('Customer Checked In', 'Status updated to CHECKED IN');
      loadBookings();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Could not check in customer');
    }
  };

  // Every finished appointment gets its bill automatically (name, service and price
  // all come from the booking). Reuses the bill if one already exists.
  const ensureInvoice = async (booking: BookingListItemDto): Promise<InvoiceRef> => {
    const existing = invoiceByBooking[booking.bookingId];
    if (existing) return existing;
    const created = await apiRequest<any>(`/api/v1/bookings/${booking.bookingId}/invoice-draft`, {
      method: 'POST',
      body: JSON.stringify({ currency: 'CAD', notes: `${booking.serviceName} for ${booking.customerName}` }),
    });
    const invoice: InvoiceRef = {
      invoiceId: created.invoiceId,
      status: created.status,
      balanceDue: toNumber(created.balanceDue ?? created.total),
      customerId: created.customerId,
    };
    setInvoiceByBooking((prev) => ({ ...prev, [booking.bookingId]: invoice }));
    return invoice;
  };

  // Records the cash for a finished appointment.
  const handleTakePayment = async () => {
    const booking = paymentBooking;
    if (!booking) return;
    setIsTakingPayment(true);
    try {
      const invoice = await ensureInvoice(booking);
      if (invoice.balanceDue > 0) {
        await apiRequest('/api/v1/payments', {
          method: 'POST',
          body: JSON.stringify({
            customerId: invoice.customerId || booking.customerId,
            invoiceId: invoice.invoiceId,
            amount: invoice.balanceDue,
            currency: 'CAD',
            paymentMethod: 'CASH',
            paymentDate: todayISO(),
            notes: `${booking.serviceName} — ${booking.customerName}`,
            idempotencyKey: generateIdempotencyKey(),
          }),
        });
      }
      // Paid in full → the backend now accepts the booking as completed.
      if (booking.status !== 'COMPLETED') {
        await apiRequest(`/api/v1/bookings/${booking.bookingId}/complete`, {
          method: 'POST',
          body: JSON.stringify({}),
        });
      }
      showSuccess('Paid', `$${formatMoney(invoice.balanceDue)} cash from ${booking.customerName}. All done!`);
      setPaymentBooking(null);
      loadBookings();
    } catch (err: any) {
      showError('Payment Failed', err.message || 'Could not record the payment.');
      loadBookings();
    } finally {
      setIsTakingPayment(false);
    }
  };

  // "Done" = the service is finished: create the bill and offer to collect the cash.
  const handleComplete = async (booking: BookingListItemDto) => {
    try {
      await ensureInvoice(booking);
    } catch (err: any) {
      showError('Could Not Create Bill', err.message || 'Please try again.');
      return;
    }
    setPaymentBooking(booking);
    loadBookings();
  };

  const handleCancelSubmit = async () => {
    if (!selectedBooking) return;
    setIsActionLoading(true);
    try {
      await apiRequest(`/api/v1/bookings/${selectedBooking.bookingId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason }),
      });
      showSuccess('Booking Cancelled', 'Appointment marked as cancelled.');
      setShowCancelModal(false);
      setSelectedBooking(null);
      loadBookings();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Could not cancel booking');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleNoShow = async (bookingId: string) => {
    if (!confirm('Mark customer as No-Show?')) return;
    try {
      await apiRequest(`/api/v1/bookings/${bookingId}/no-show`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Customer did not arrive for scheduled slot' }),
      });
      showSuccess('Marked No-Show', 'Appointment marked as NO_SHOW');
      loadBookings();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Could not mark as no show');
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedBooking) return;
    setIsActionLoading(true);
    try {
      await apiRequest(`/api/v1/bookings/${selectedBooking.bookingId}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({
          date: rescheduleDate,
          startTime:
            rescheduleTime.includes(':') && rescheduleTime.split(':').length === 2
              ? `${rescheduleTime}:00`
              : rescheduleTime,
        }),
      });
      showSuccess('Rescheduled', `Appointment moved to ${rescheduleDate} at ${rescheduleTime}`);
      setShowRescheduleModal(false);
      setSelectedBooking(null);
      loadBookings();
    } catch (err: any) {
      showError('Reschedule Failed', err.message || 'Could not reschedule appointment');
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      (b.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.serviceName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.staffName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesDate = !dateFilter || b.date === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Appointments Calendar</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Manage customer appointments, book walk-ins, update service status, and generate automated invoice drafts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadBookings}
            className="p-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)]"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenWalkIn}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-colors"
            title="Fast Walk-in Booking"
          >
            <Wallet className="w-4 h-4" />
            <span>Walk In</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Appointment</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar with Date Selector */}
      <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-[var(--border)]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search customer, specialist, service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Date Picker Filter */}
          <div className="flex items-center gap-1.5 bg-[var(--muted)] px-2.5 py-1.5 rounded-xl border border-[var(--border-strong)]">
            <CalendarIcon className="w-4 h-4 text-[var(--primary)] shrink-0" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-[var(--foreground)] focus:outline-none cursor-pointer"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-[10px] font-bold text-[var(--muted-foreground)] hover:text-rose-600 ml-1"
                title="Clear date filter"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-[var(--muted-foreground)]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Booked (not confirmed)</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED_IN">Arrived</option>
              <option value="COMPLETED">Done</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No-show</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">Loading appointment schedules...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CalendarIcon className="w-10 h-10 text-[var(--muted-foreground)] mx-auto opacity-40" />
            <h3 className="text-sm font-bold text-[var(--foreground)]">No appointments found</h3>
            <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
              Schedule appointments manually or accept client bookings from the online customer booking wizard.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={handleOpenWalkIn}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Quick Walk-In Booking
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="btn-primary px-4 py-2 rounded-xl text-xs font-bold"
              >
                New Appointment
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filteredBookings.map((b) => (
              <div
                key={b.bookingId}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--muted)]/50 transition-colors"
              >
                {/* Left Client & Service Details */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shrink-0 border border-[var(--primary-ring)] font-bold text-xs">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-black text-[var(--foreground)]">{b.customerName}</h3>
                      <span className="text-[10px] text-[var(--muted-foreground)] font-mono">#{String(b.bookingId).substring(0, 8)}</span>
                    </div>
                    <p className="text-xs font-bold text-[var(--primary)] mt-0.5">{b.serviceName}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-[var(--muted-foreground)] font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                        {wallClockTime(b.startTime)}{b.date ? ` (${b.date})` : ''}
                      </span>
                      <span>· Specialist: {b.staffName || 'Any Specialist'}</span>
                      {b.notes && <span className="italic text-[10px]">· &ldquo;{b.notes}&rdquo;</span>}
                    </div>
                  </div>
                </div>

                {/* Right Status & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right space-y-1">
                    <span className="text-sm font-black text-[var(--foreground)] block">
                      ${formatMoney(b.totalAmount)} {b.currency || 'CAD'}
                    </span>
                    {b.status === 'CANCELLED' || b.status === 'NO_SHOW' ? (
                      <Badge variant={b.status} />
                    ) : (
                      (() => {
                        const step = stepOf(b.status, !!invoiceByBooking[b.bookingId]);
                        const paid = step === 4;
                        return (
                          <div className="flex flex-col items-end gap-1" title={STEPS.join(' → ')}>
                            <div className="flex gap-0.5" aria-hidden>
                              {STEPS.map((label, i) => (
                                <span
                                  key={label}
                                  className={`h-1.5 w-4 rounded-full ${
                                    i <= step ? (paid ? 'bg-emerald-500' : 'bg-[var(--primary)]') : 'bg-[var(--border-strong)]'
                                  }`}
                                />
                              ))}
                            </div>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                paid ? 'text-emerald-600' : 'text-[var(--muted-foreground)]'
                              }`}
                            >
                              {STEPS[step]}
                            </span>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {(b.status === 'DRAFT' || b.status === 'LOCKED' || b.status === 'SCHEDULED') && (
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setShowConfirmModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200"
                        title="Confirm this appointment"
                      >
                        Confirm
                      </button>
                    )}

                    {b.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleCheckin(b.bookingId)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200"
                        title="The customer has arrived"
                      >
                        Arrived
                      </button>
                    )}

                    {b.status === 'CHECKED_IN' && !invoiceByBooking[b.bookingId] && (
                      <button
                        onClick={() => handleComplete(b)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--primary)] text-white hover:brightness-110"
                        title="The service is finished"
                      >
                        Done
                      </button>
                    )}

                    {b.status === 'CHECKED_IN' && !!invoiceByBooking[b.bookingId] && (
                      <button
                        onClick={() => setPaymentBooking(b)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
                        title="Record the cash payment"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        Take payment
                      </button>
                    )}

                    {['DRAFT', 'LOCKED', 'SCHEDULED', 'CONFIRMED'].includes(b.status) && (
                      <>
                        {b.status === 'CONFIRMED' && (
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setShowRescheduleModal(true);
                          }}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          title="Reschedule"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        )}
                        {b.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleNoShow(b.bookingId)}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                          title="Mark No-Show"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setShowCancelModal(true);
                          }}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Cancel Booking"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Booking Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Schedule New Appointment"
        maxWidth="md"
      >
        <form onSubmit={handleCreateBooking} className="space-y-4">
          {bookingSuccessNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{bookingSuccessNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Customer Name</label>
              <input
                type="text"
                required
                placeholder="e.g. David Miller"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Phone</label>
              <input
                type="text"
                required
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Active Service Offering</label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                {services.map((s) => (
                  <option key={s.serviceId} value={s.serviceId}>
                    {s.name} (${formatMoney(s.price)} CAD)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Specialist</label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="">Any Available Specialist</option>
                {staffList.map((stf) => (
                  <option key={stf.staffId} value={stf.staffId}>
                    {stf.fullName} ({stf.roleTitle || 'Stylist'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Enhanced Beautiful Date & Time Picker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Appointment Date</label>
              <div className="space-y-1.5">
                <div className="relative">
                  <CalendarIcon className="w-4 h-4 text-[var(--primary)] absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setBookingDate(todayISO())}
                    className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                      bookingDate === todayISO()
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingDate(addDaysISO(1));
                    }}
                    className="px-2 py-0.5 rounded-md font-bold bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Start Time</label>
              <div className="space-y-1.5">
                <div className="relative">
                  <Clock className="w-4 h-4 text-[var(--primary)] absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="time"
                    required
                    value={bookingTime.substring(0, 5)}
                    onChange={(e) => setBookingTime(`${e.target.value}:00`)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                  <span>Operating hours: 9AM - 6PM</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Notes / Instructions</label>
            <input
              type="text"
              placeholder="e.g. Razor line up requested, walk-in customer"
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingCreate}
              className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingCreate ? 'Saving...' : 'Confirm & Save Booking'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Take Payment Modal */}
      {paymentBooking && (
        <Modal isOpen onClose={() => setPaymentBooking(null)} title="Collect payment" maxWidth="sm">
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[var(--muted)] space-y-1">
              <p className="text-xs font-bold text-[var(--foreground)]">{paymentBooking.customerName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {paymentBooking.serviceName} · {wallClockTime(paymentBooking.startTime)} ({paymentBooking.date})
              </p>
              <p className="text-2xl font-black text-[var(--foreground)] pt-2">
                $
                {formatMoney(
                  invoiceByBooking[paymentBooking.bookingId]?.balanceDue ?? paymentBooking.totalAmount
                )}{' '}
                <span className="text-xs font-bold text-[var(--muted-foreground)]">CAD</span>
              </p>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              The bill was created automatically. Record the cash now, or choose “Later” and use
              “Take payment” on this appointment (or the Payments page) when the customer pays.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setPaymentBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
              >
                Later
              </button>
              <button
                onClick={handleTakePayment}
                disabled={isTakingPayment}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              >
                {isTakingPayment ? 'Recording...' : 'Cash received'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Booking Modal */}
      {selectedBooking && showConfirmModal && (
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title={`Confirm Appointment #${String(selectedBooking.bookingId).substring(0, 8)}`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--muted-foreground)] font-medium">
              Adjust tax, tip, or discount amounts before finalizing confirmation.
            </p>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold mb-1">Tax / VAT ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={vatTaxAmount}
                  onChange={(e) => setVatTaxAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">Tip ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">Discount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isActionLoading}
                className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {isActionLoading ? 'Confirming...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Reason Modal */}
      {selectedBooking && showCancelModal && (
        <Modal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          title="Cancel Appointment"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--muted-foreground)]">
              Are you sure you want to cancel the appointment for <strong>{selectedBooking.customerName}</strong>?
            </p>
            <div>
              <label className="block text-xs font-bold mb-1">Cancellation Reason</label>
              <input
                type="text"
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)]"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelSubmit}
                disabled={isActionLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isActionLoading ? 'Cancelling...' : 'Cancel Appointment'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reschedule Modal */}
      {selectedBooking && showRescheduleModal && (
        <Modal
          isOpen={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          title="Reschedule Appointment"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1">New Date</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">New Start Time</label>
              <input
                type="time"
                value={rescheduleTime.substring(0, 5)}
                onChange={(e) => setRescheduleTime(`${e.target.value}:00`)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)]"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleSubmit}
                disabled={isActionLoading}
                className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {isActionLoading ? 'Saving...' : 'Reschedule'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
