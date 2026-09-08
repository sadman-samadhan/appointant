'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID } from '@/lib/api/config';
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
} from 'lucide-react';
import {
  BookingListItemDto,
  BookingStatus,
  ServiceDto,
  StaffResponseDto,
  CustomerDto,
} from '@/lib/types';

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
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('10:00:00');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [bookingSuccessNotice, setBookingSuccessNotice] = useState<string | null>(null);

  // Action Modals: Cancel, Reschedule, Confirm, Draft Invoice
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Client requested cancellation');

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [rescheduleTime, setRescheduleTime] = useState('11:00:00');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [vatTaxAmount, setVatTaxAmount] = useState('0.00');
  const [tipAmount, setTipAmount] = useState('0.00');
  const [discountAmount, setDiscountAmount] = useState('0.00');

  const [isActionLoading, setIsActionLoading] = useState(false);

  const resetForm = useCallback(() => {
    setNewCustName('');
    setNewCustPhone('+1 (506) ');
    setNewCustEmail('');
    setBookingNotes('');
    setBookingDate(new Date().toISOString().split('T')[0]);
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
    setBookingDate(new Date().toISOString().split('T')[0]);
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
      const srvList = srvRes.items || srvRes.services || srvRes || [];
      if (Array.isArray(srvList)) {
        // Bug D3 fix: only active services
        const activeOnly = srvList.filter(
          (s: any) => s.status === 'ACTIVE' || s.isActive === true || (!s.status && s.isActive !== false)
        );
        const effective = activeOnly.length > 0 ? activeOnly : srvList;
        setServices(effective);
        if (effective.length > 0) {
          setSelectedServiceId(effective[0].serviceId || effective[0].id);
        }
      }
    } catch {
      setServices([]);
    }

    try {
      const stfRes = await apiRequest<any>(`/api/v1/staff?tenantId=${DEFAULT_TENANT_ID}`);
      const stfList = stfRes.items || stfRes.staff || stfRes.data || (Array.isArray(stfRes) ? stfRes : []);
      if (Array.isArray(stfList)) {
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
      const cList = custRes.items || custRes.customers || custRes || [];
      if (Array.isArray(cList)) {
        setCustomers(cList);
      }
    } catch {
      setCustomers([]);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<any>('/api/v1/bookings');
      const list: any[] = res.items || res.bookings || res || [];
      if (Array.isArray(list)) {
        setBookings(
          list.map((b: any) => ({
            bookingId: b.bookingId || b.id,
            customerId: b.customerId,
            customerName: b.customerName || b.customer?.fullName || 'Salon Client',
            serviceId: b.serviceId,
            serviceName: b.serviceName || b.service?.name || 'Salon Service',
            staffId: b.staffId,
            staffName: b.staffName || b.staff?.fullName,
            date: b.date || b.startTime?.split('T')[0] || new Date().toISOString().split('T')[0],
            startTime: b.startTime,
            endTime: b.endTime,
            status: (b.status || 'SCHEDULED') as BookingStatus,
            totalAmount: Number(b.totalAmount ?? b.service?.basePrice ?? 25),
            currency: b.currency || 'CAD',
            notes: b.notes,
          }))
        );
      }
    } catch {
      setBookings([]);
    } finally {
      setIsLoading(false);
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
      let customerId = `cust-${Date.now()}`;

      // 1. Link or Create Customer
      try {
        const cRes = await apiRequest<any>('/api/v1/customers', {
          method: 'POST',
          body: JSON.stringify({
            fullName: newCustName.trim(),
            contacts: [
              { type: 'PHONE', value: newCustPhone.trim(), isPrimary: true },
              ...(newCustEmail.trim() ? [{ type: 'EMAIL', value: newCustEmail.trim(), isPrimary: false }] : []),
            ],
          }),
        });
        customerId = cRes?.customerId || cRes?.id || customerId;
        if (customerId) {
          await apiRequest(`/api/v1/tenants/${DEFAULT_TENANT_ID}/customers`, {
            method: 'POST',
            body: JSON.stringify({ customerId, preferredBranchId: DEFAULT_BRANCH_ID }),
          }).catch(() => {});
        }
      } catch {
        /* fallback to generated */
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

      const createdBookingId = bookingRes?.bookingId || bookingRes?.id;

      // 3. Automated draft invoice generation
      if (createdBookingId) {
        const selectedSrv = services.find(
          (s) => s.serviceId === selectedServiceId || (s as any).id === selectedServiceId
        );
        await apiRequest(`/api/v1/bookings/${createdBookingId}/invoice-draft`, {
          method: 'POST',
          body: JSON.stringify({
            currency: 'CAD',
            amount: selectedSrv?.price || 30.0,
            customerId,
            notes: `Draft invoice for appointment #${createdBookingId} (${selectedSrv?.name || 'Service'})`,
          }),
        }).catch(() => {});
      }

      // Display success message, then close and reset
      setBookingSuccessNotice(`Appointment booked successfully for ${newCustName}! Draft invoice generated.`);
      showSuccess('Booking Created & Invoice Drafted', `Appointment confirmed for ${newCustName}`);

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

  const handleComplete = async (bookingId: string) => {
    try {
      await apiRequest(`/api/v1/bookings/${bookingId}/complete`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      showSuccess('Appointment Completed', 'Service rendered successfully.');
      loadBookings();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Could not complete booking');
    }
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
    const matchesDate = !dateFilter || (b.date || b.startTime?.split('T')[0]) === dateFilter;
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
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="CHECKED_IN">CHECKED IN</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="NO_SHOW">NO SHOW</option>
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
                      <span className="text-[10px] text-[var(--muted-foreground)] font-mono">#{b.bookingId.substring(0, 8)}</span>
                    </div>
                    <p className="text-xs font-bold text-[var(--primary)] mt-0.5">{b.serviceName}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-[var(--muted-foreground)] font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                        {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({b.date || b.startTime?.split('T')[0]})
                      </span>
                      <span>· Specialist: {b.staffName || 'Any Specialist'}</span>
                      {b.notes && <span className="italic text-[10px]">· &ldquo;{b.notes}&rdquo;</span>}
                    </div>
                  </div>
                </div>

                {/* Right Status & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <span className="text-sm font-black text-[var(--foreground)] block">
                      ${b.totalAmount.toFixed(2)} {b.currency || 'CAD'}
                    </span>
                    <Badge variant={b.status} />
                  </div>

                  <div className="flex items-center gap-1">
                    {b.status === 'SCHEDULED' && (
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setShowConfirmModal(true);
                        }}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        title="Confirm Booking"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    {b.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleCheckin(b.bookingId)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200"
                        title="Customer Arrived"
                      >
                        Check In
                      </button>
                    )}

                    {b.status === 'CHECKED_IN' && (
                      <button
                        onClick={() => handleComplete(b.bookingId)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                        title="Finish Appointment"
                      >
                        Complete
                      </button>
                    )}

                    {b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW' && (
                      <>
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
                        <button
                          onClick={() => handleNoShow(b.bookingId)}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                          title="Mark No-Show"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
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
                    {s.name} (${s.price.toFixed(2)} CAD)
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
                    onClick={() => setBookingDate(new Date().toISOString().split('T')[0])}
                    className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                      bookingDate === new Date().toISOString().split('T')[0]
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tmr = new Date();
                      tmr.setDate(tmr.getDate() + 1);
                      setBookingDate(tmr.toISOString().split('T')[0]);
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

      {/* Confirm Booking Modal */}
      {selectedBooking && showConfirmModal && (
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title={`Confirm Appointment #${selectedBooking.bookingId.substring(0, 8)}`}
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
