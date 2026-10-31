'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID } from '@/lib/api/config';
import {
  UserCheck,
  Plus,
  Search,
  Mail,
  Phone,
  Tag,
  Award,
  RefreshCw,
  Clock,
  Scissors,
  FileText,
  PlusCircle,
  Calendar,
  Info,
} from 'lucide-react';
import { CustomerDto, BookingListItemDto, CustomerNoteDto } from '@/lib/types';
import { formatMoney, toNumber, toList, bookingLocalDate } from '@/lib/format';
import { formatPhone, formatPhoneInput, isValidPhone, PHONE_ERROR, PHONE_PLACEHOLDER } from '@/lib/phone';

// Tenant-scoped endpoints (notes, tags, archive) are keyed by tenantCustomerId, not customerId.
type DirectoryCustomer = CustomerDto & { tenantCustomerId?: string };

function formatDate(value: unknown): string {
  if (!value) return '—';
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

// Booking times are shop wall-clock times; see bookingLocalDate.
function bookingDate(b: any): string {
  return bookingLocalDate(b)?.toLocaleDateString() || '—';
}

export default function AdminCustomersPage() {
  const { showSuccess, showError } = useToast();

  const [customers, setCustomers] = useState<DirectoryCustomer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Add Customer Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);

  // Customer Detail Modal (History & Notes)
  const [selectedCustomer, setSelectedCustomer] = useState<DirectoryCustomer | null>(null);
  const [customerBookings, setCustomerBookings] = useState<BookingListItemDto[]>([]);
  const [customerNotes, setCustomerNotes] = useState<CustomerNoteDto[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const searchParam = searchTerm.trim() ? `?search=${encodeURIComponent(searchTerm.trim())}` : '';
      const res = await apiRequest<any>(`/api/v1/tenants/${DEFAULT_TENANT_ID}/customers${searchParam}`);
      const list = toList<any>(res, 'customers').filter(Boolean);
      const findContact = (contacts: any, type: string) =>
        Array.isArray(contacts) ? contacts.find((ct: any) => ct?.type === type)?.value : undefined;
      const normalized: DirectoryCustomer[] = list.map((c: any) => {
        const cust = c.customer || c;
        const primaryPhone =
          cust.phone || c.phone || findContact(cust.contacts, 'PHONE') || findContact(c.contacts, 'PHONE') || cust.mobile;
        const primaryEmail = cust.email || c.email || findContact(cust.contacts, 'EMAIL') || findContact(c.contacts, 'EMAIL');
        const rawTags = c.customerTags || cust.tags || c.tags;
        // Tags may come back as strings or as {tag}/{name} objects - render strings only.
        const tags = Array.isArray(rawTags)
          ? rawTags.map((t: any) => (typeof t === 'string' ? t : t?.tag || t?.name || t?.label)).filter(Boolean)
          : [];
        return {
          customerId: c.customerId || cust.customerId || c.id,
          tenantCustomerId: c.tenantCustomerId,
          id: cust.id || c.id || cust.customerId || c.customerId,
          customerCode: c.customerCode || cust.customerCode,
          fullName: cust.fullName || c.fullName || cust.name || c.name || 'Client',
          phone: primaryPhone,
          email: primaryEmail,
          totalVisits: toNumber(c.totalBookings ?? cust.totalBookings ?? c.totalVisits),
          totalSpent: toNumber(c.totalSpent ?? cust.totalSpent),
          tags,
        };
      });
      setCustomers(normalized);
    } catch {
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Create Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showError('Name Required', 'Please enter customer full name.');
      return;
    }
    if (!isValidPhone(phone)) {
      showError('Phone needed', PHONE_ERROR);
      return;
    }
    setIsSubmittingCustomer(true);
    try {
      const custRes = await apiRequest<any>('/api/v1/customers', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          contacts: [
            { type: 'PHONE', value: formatPhone(phone), isPrimary: true },
            ...(email.trim() ? [{ type: 'EMAIL', value: email.trim(), isPrimary: false }] : []),
          ],
        }),
      });

      const newCustomerId = custRes?.customerId || custRes?.id;
      if (newCustomerId) {
        await apiRequest(`/api/v1/tenants/${DEFAULT_TENANT_ID}/customers`, {
          method: 'POST',
          body: JSON.stringify({
            customerId: newCustomerId,
            preferredBranchId: DEFAULT_BRANCH_ID,
          }),
        });
      }

      showSuccess('Customer Added', `${fullName} registered in salon directory.`);
      setShowAddModal(false);
      setFullName('');
      setPhone('');
      setEmail('');
      loadCustomers();
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Could not link customer');
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  // Open Detail Modal
  const openCustomerDetails = async (customer: DirectoryCustomer) => {
    setSelectedCustomer(customer);
    setIsLoadingDetails(true);

    try {
      const bkRes = await apiRequest<any>(`/api/v1/customers/${customer.customerId}/bookings`);
      setCustomerBookings(toList(bkRes, 'bookings'));
    } catch {
      setCustomerBookings([]);
    }

    if (customer.tenantCustomerId) {
      try {
        const notesRes = await apiRequest<any>(
          `/api/v1/tenants/${DEFAULT_TENANT_ID}/customers/${customer.tenantCustomerId}/notes`
        );
        setCustomerNotes(toList(notesRes, 'notes'));
      } catch {
        setCustomerNotes([]);
      }
    } else {
      setCustomerNotes([]);
    }

    setIsLoadingDetails(false);
  };

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !newNoteText.trim()) return;
    if (!selectedCustomer.tenantCustomerId) {
      showError('Note Failed', 'This customer is not linked to the salon yet.');
      return;
    }
    setIsSubmittingNote(true);
    try {
      await apiRequest(
        `/api/v1/tenants/${DEFAULT_TENANT_ID}/customers/${selectedCustomer.tenantCustomerId}/notes`,
        {
          method: 'POST',
          body: JSON.stringify({ content: newNoteText.trim() }),
        }
      );
      showSuccess('Note Added', 'Client preference note saved.');
      setNewNoteText('');
      openCustomerDetails(selectedCustomer);
    } catch (err: any) {
      showError('Note Failed', err?.message || 'Could not save note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Customer</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Customer directory, contact profiles, visit history, and client preferences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCustomers}
            className="p-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)]"
            title="Refresh Directory"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-[var(--border)]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search customer by name, phone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
      </div>

      {/* Customer List */}
      <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">Loading customer directory...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <UserCheck className="w-10 h-10 text-[var(--muted-foreground)] mx-auto opacity-40" />
            <h3 className="text-sm font-bold text-[var(--foreground)]">No customers linked</h3>
            <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
              Add a customer profile or create bookings to build your customer directory.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Register First Customer</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {customers.map((cust) => (
              <div
                key={cust.tenantCustomerId || cust.customerId}
                onClick={() => openCustomerDetails(cust)}
                className="p-4 flex items-center justify-between gap-4 hover:bg-[var(--muted)]/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shrink-0 border border-[var(--primary-ring)] font-bold text-xs">
                    {(cust.fullName || '?').charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[var(--foreground)]">{cust.fullName}</h3>
                    <span className="text-[11px] text-[var(--muted-foreground)] font-medium">
                      {cust.phone || cust.email || 'Registered Client'}
                    </span>
                  </div>
                </div>

                {/* Right Side Info ("i") Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCustomerDetails(cust);
                  }}
                  className="w-8 h-8 rounded-full border border-[var(--border-strong)] bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--card)] flex items-center justify-center transition-all shadow-xs"
                  title="View Customer Information"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Customer Profile"
        maxWidth="md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. David Miller"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Phone Number</label>
              <input
                type="tel"
                required
                placeholder={PHONE_PLACEHOLDER}
                value={phone}
                onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                onBlur={() => isValidPhone(phone) && setPhone(formatPhone(phone))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Email (Optional)</label>
              <input
                type="email"
                placeholder="david@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingCustomer}
              className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingCustomer ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Customer Detail & Notes Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={`Client Profile: ${selectedCustomer.fullName}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Quick summary banner with all details */}
            <div className="p-4 rounded-2xl bg-[var(--muted)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-[var(--foreground)]">{selectedCustomer.fullName}</h3>
                  <span className="text-[10px] text-[var(--muted-foreground)] font-mono">ID: {selectedCustomer.customerId}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[var(--muted-foreground)] block">Total Spend</span>
                  <span className="text-base font-black text-emerald-600">
                    ${formatMoney(selectedCustomer.totalSpent)} CAD
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)]">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>{selectedCustomer.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span className="truncate">{selectedCustomer.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Visits: {selectedCustomer.totalVisits || customerBookings.length}</span>
                </div>
              </div>

              {selectedCustomer.tags && selectedCustomer.tags.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                  {selectedCustomer.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--card)] text-[var(--primary)] border border-[var(--border)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Visit History Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-[var(--foreground)] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[var(--primary)]" />
                <span>Appointment History ({customerBookings.length})</span>
              </h4>
              {customerBookings.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)] p-3 rounded-xl bg-[var(--muted)]/50 text-center">
                  No previous bookings on record.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] overflow-hidden max-h-40 overflow-y-auto">
                  {customerBookings.map((b: any, idx) => (
                    <div key={b.bookingId || b.id || idx} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[var(--foreground)] block">
                          {b.serviceName || b.service?.name || 'Salon Service'}
                        </span>
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          {bookingDate(b)} · Specialist: {b.staffName || b.staff?.fullName || 'Specialist'}
                        </span>
                      </div>
                      <Badge variant={b.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Client Notes & Preferences */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-[var(--foreground)] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[var(--primary)]" />
                <span>Client Preferences & Notes</span>
              </h4>

              {customerNotes.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {customerNotes.map((n: any, idx) => (
                    <div key={n.noteId || n.id || idx} className="p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs">
                      <p className="font-medium text-[var(--foreground)]">{n.content ?? n.note}</p>
                      <span className="text-[10px] text-[var(--muted-foreground)] mt-0.5 block">
                        {formatDate(n.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Add styling preference or client note..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-medium"
                />
                <button
                  type="submit"
                  disabled={isSubmittingNote}
                  className="btn-primary px-4 py-2 rounded-xl text-xs font-bold"
                >
                  {isSubmittingNote ? 'Saving...' : 'Add Note'}
                </button>
              </form>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
