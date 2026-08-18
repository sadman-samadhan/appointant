'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/context/ToastContext';
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
} from 'lucide-react';
import { BookingListItemDto } from '@/lib/types';

export default function AdminAppointmentsPage() {
  const [bookings, setBookings] = useState<BookingListItemDto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingListItemDto | null>(null);

  // Form states for new booking
  const [customerName, setCustomerName] = useState('');
  const [serviceName, setServiceName] = useState('Haircut Service');
  const [amount, setAmount] = useState('23.00');
  const [bookingTime, setBookingTime] = useState('10:00');
  const { showSuccess, showError } = useToast();

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<any>('/api/v1/bookings');
      setBookings(res.items || res.bookings || []);
    } catch {
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/v1/bookings', {
        method: 'POST',
        body: JSON.stringify({
          customerName,
          serviceName,
          totalAmount: parseFloat(amount),
          startTime: new Date().toISOString(),
          status: 'CONFIRMED',
        }),
      });
      showSuccess('Booking Created', `New appointment registered for ${customerName}`);
      setShowCreateModal(false);
      setCustomerName('');
      loadBookings();
    } catch (err: any) {
      showError('Booking Failed', err.message || 'Could not create booking');
    }
  };

  const handleStatusChange = async (bookingId: string, action: string) => {
    try {
      await apiRequest(`/api/v1/bookings/${bookingId}/${action}`, { method: 'POST' });
      showSuccess('Status Updated', `Booking changed to ${action.toUpperCase()}`);
      if (selectedBooking && selectedBooking.bookingId === bookingId) {
        setSelectedBooking(null);
      }
      loadBookings();
    } catch (err: any) {
      showError('Update Error', err.message || `Failed to update to ${action}`);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      (b.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.serviceName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Appointments Calendar</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Manage customer bookings, schedule shifts, and update status.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm self-start"
        >
          <Plus className="w-4 h-4" />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search customer or service..."
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
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="SCHEDULED">SCHEDULED</option>
            <option value="CHECKED_IN">CHECKED IN</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Appointments List */}
      <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CalendarIcon className="w-8 h-8 text-[var(--muted-foreground)] mx-auto opacity-50" />
            <p className="text-xs font-bold text-[var(--foreground)]">No appointments found</p>
            <p className="text-[11px] text-[var(--muted-foreground)]">Try adjusting search or status filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filteredBookings.map((b) => (
              <div
                key={b.bookingId}
                onClick={() => setSelectedBooking(b)}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--muted)]/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shrink-0 border border-[var(--primary-ring)]">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[var(--foreground)]">{b.customerName}</h3>
                    <p className="text-xs font-bold text-[var(--primary)]">{b.serviceName}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--muted-foreground)] font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>· {b.staffName || 'Any Specialist'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
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

      {/* Create Booking Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Appointment"
        maxWidth="md"
      >
        <form onSubmit={handleCreateBooking} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Customer Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. John Smith"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Service</label>
              <select
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              >
                <option value="Haircut Service">Haircut Service ($23)</option>
                <option value="Fade Haircut Service">Fade Haircut ($25)</option>
                <option value="Haircut & Beard Trim Combo">Combo Cut & Beard ($38)</option>
                <option value="Hot Towel Shave">Hot Towel Shave ($25)</option>
                <option value="Beard Trim Service">Beard Trim ($22)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Price (CAD $)</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary px-5 py-2 rounded-xl text-xs font-bold">
              Save Appointment
            </button>
          </div>
        </form>
      </Modal>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <Modal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title="Appointment Details"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--muted)]">
              <div>
                <h3 className="text-sm font-black text-[var(--foreground)]">{selectedBooking.customerName}</h3>
                <p className="text-xs font-bold text-[var(--primary)]">{selectedBooking.serviceName}</p>
              </div>
              <Badge variant={selectedBooking.status} size="md" />
            </div>

            <div className="space-y-2 text-xs font-medium text-[var(--foreground)]">
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--muted-foreground)]">Amount:</span>
                <span className="font-bold">${selectedBooking.totalAmount} CAD</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--muted-foreground)]">Location:</span>
                <span className="font-bold">Downtown Main (BD-DT01)</span>
              </div>
            </div>

            {/* Workflow Action Triggers */}
            <div className="pt-3 border-t border-[var(--border)] flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => handleStatusChange(selectedBooking.bookingId, 'complete')}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
              </button>

              <button
                onClick={() => handleStatusChange(selectedBooking.bookingId, 'cancel')}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel Booking
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
