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

  const loadDependencies = useCallback(async () => {
    try {
      const srvRes = await apiRequest<any>(`/api/v1/services/branches/${DEFAULT_BRANCH_ID}`);
      const srvList = srvRes.items || srvRes.services || srvRes || [];
      if (Array.isArray(srvList)) {
        setServices(srvList);
        if (srvList.length > 0) setSelectedServiceId(srvList[0].serviceId || srvList[0].id);
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
          roleTitle: s.roleTitle || s.role || 'Specialist',
          employmentType: s.employmentType || 'FULL_TIME',
          status: s.status || 'ACTIVE',
        }));
        setStaffList(normalized);
      }
    } catch {
      setStaffList([]);
    }

    try {
      const custRes = await apiRequest<any>(`/api/v1/tenants/${DEFAULT_TENANT_ID}/customers`);
      const custList = custRes.items || custRes.customers || custRes || [];
      if (Array.isArray(custList)) {
        setCustomers(custList);
      }
    } catch {
      setCustomers([]);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusParam = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const res = await apiRequest<any>(`/api/v1/bookings${statusParam}`);
      const list: BookingListItemDto[] = res.items || res.bookings || res || [];
      if (Array.isArray(list)) {
        const normalized = list.map((b: any) => ({
          bookingId: b.bookingId || b.id,
          customerName: b.customerName || b.customer?.fullName || 'Client',
          customerPhone: b.customerPhone || b.customer?.phone,
          customerEmail: b.customerEmail || b.customer?.email,
          serviceName: b.serviceName || b.service?.name || 'Salon Service',
          staffName: b.staffName || b.staff?.fullName,
          startTime: b.startTime || b.date,
          endTime: b.endTime,
          status: (b.status || 'SCHEDULED') as BookingStatus,
          totalAmount: Number(b.totalAmount ?? b.service?.basePrice ?? 25),
          currency: b.currency || 'CAD',
          notes: b.notes,
        }));
        setBookings(normalized);
      }
    } catch {
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadDependencies();
  }, [loadDependencies]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Create Booking
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      showError('Name Required', 'Please enter customer name.');
      return;
    }
    setIsSubmittingCreate(true);
    try {
      // 1. Create or Find Customer
      let customerId = `cust-${Date.now()}`;
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
      await apiRequest('/api/v1/bookings', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: DEFAULT_TENANT_ID,
          branchId: DEFAULT_BRANCH_ID,
          customerId,
          serviceId: selectedServiceId,
          staffId: selectedStaffId || undefined,
          date: bookingDate,
          startTime: bookingTime.includes(':') && bookingTime.split(':').length === 2 ? `${bookingTime}:00` : bookingTime,
          notes: bookingNotes.trim() || undefined,
        }),
      });

      showSuccess('Booking Created', `New appointment confirmed for ${newCustName}`);
      setShowCreateModal(false);
      setNewCustName('');
      setNewCustEmail('');
      setBookingNotes('');
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
      });
      showSuccess('Appointment Completed', 'Service rendered successfully.');
      loadBookings();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Could not complete appointment');
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
          startTime: rescheduleTime.includes(':') && rescheduleTime.split(':').length === 2 ? `${rescheduleTime}:00` : rescheduleTime,
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

  const handleGenerateInvoiceDraft = async (booking: BookingListItemDto) => {
    try {
      await apiRequest(`/api/v1/bookings/${booking.bookingId}/invoice-draft`, {
        method: 'POST',
        body: JSON.stringify({
          currency: 'CAD',
          notes: `Invoice generated for ${booking.customerName} - ${booking.serviceName}`,
        }),
      });
      showSuccess('Draft Invoice Generated', 'Invoice generated. Visit Invoices ledger to collect cash.');
    } catch (err: any) {
      showError('Invoice Failed', err.message || 'Could not generate draft invoice');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      (b.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.serviceName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.staffName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Appointments Calendar</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Manage customer bookings, schedule shifts, update status, and generate invoices.
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
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Appointment</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
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

        <div className="flex items-center gap-2 w-full sm:w-auto">
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

      {/* Appointments List */}
      <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">Loading appointment schedules...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CalendarIcon className="w-10 h-10 text-[var(--muted-foreground)] mx-auto opacity-40" />
            <h3 className="text-sm font-bold text-[var(--foreground)]">No appointments found</h3>
            <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
              Schedule a new appointment or adjust search filters.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filteredBookings.map((b) => (
              <div
                key={b.bookingId}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--muted)]/50 transition-colors"
              >
                <div
                  onClick={() => setSelectedBooking(b)}
                  className="flex items-start gap-3 cursor-pointer flex-1"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shrink-0 border border-[var(--primary-ring)]">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[var(--foreground)]">{b.customerName}</h3>
                    <p className="text-xs font-bold text-[var(--primary)]">{b.serviceName}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--muted-foreground)] font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(b.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      <span>· Specialist: {b.staffName || 'Any Specialist'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
                  <div className="text-right">
                    <span className="text-sm font-black text-[var(--foreground)] block">
                      ${b.totalAmount} {b.currency || 'CAD'}
                    </span>
                    <Badge variant={b.status} />
                  </div>

                  {/* Action Triggers */}
                  <div className="flex items-center gap-1">
                    {b.status === 'SCHEDULED' && (
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setShowConfirmModal(true);
                        }}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                        title="Confirm Booking (Add Tax/Tip)"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    {(b.status === 'CONFIRMED' || b.status === 'SCHEDULED') && (
                      <button
                        onClick={() => handleCheckin(b.bookingId)}
                        className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50"
                        title="Check-In Customer"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                    )}

                    {b.status === 'CHECKED_IN' && (
                      <button
                        onClick={() => handleComplete(b.bookingId)}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                        title="Complete Service"
                      >
                        <CalendarCheck2 className="w-4 h-4" />
                      </button>
                    )}

                    {b.status === 'COMPLETED' && (
                      <button
                        onClick={() => handleGenerateInvoiceDraft(b)}
                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50"
                        title="Generate Draft Invoice"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    )}

                    {b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setShowRescheduleModal(true);
                          }}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                          title="Reschedule"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleNoShow(b.bookingId)}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50"
                          title="Mark No-Show"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setShowCancelModal(true);
                          }}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
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
        onClose={() => setShowCreateModal(false)}
        title="Schedule New Appointment"
        maxWidth="md"
      >
        <form onSubmit={handleCreateBooking} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Customer Name</label>
              <input
                type="text"
                required
                placeholder="e.g. David Miller"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Phone</label>
              <input
                type="text"
                required
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Service Offering</label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              >
                {services.map((s) => (
                  <option key={s.serviceId} value={s.serviceId}>
                    {s.name} (${s.price} CAD)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Specialist</label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Date</label>
              <input
                type="date"
                required
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Start Time</label>
              <input
                type="time"
                required
                value={bookingTime.substring(0, 5)}
                onChange={(e) => setBookingTime(`${e.target.value}:00`)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Notes / Instructions</label>
            <input
              type="text"
              placeholder="e.g. Razor line up requested"
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingCreate}
              className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingCreate ? 'Saving...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Booking (with Financial Breakdown) Modal */}
      {selectedBooking && showConfirmModal && (
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title={`Confirm Appointment #${selectedBooking.bookingId}`}
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
