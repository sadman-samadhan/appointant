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
} from 'lucide-react';
import { CustomerDto, BookingListItemDto, CustomerNoteDto } from '@/lib/types';

export default function AdminCustomersPage() {
  const { showSuccess, showError } = useToast();

  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Add Customer Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+1 (506) 555-0199');
  const [email, setEmail] = useState('');
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);

  // Customer Detail Modal (History & Notes)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);
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
      const list: CustomerDto[] = res.items || res.customers || res || [];
      if (Array.isArray(list)) {
        const normalized = list.map((c: any) => {
          const cust = c.customer || c;
          const primaryPhone =
            cust.phone || c.phone || cust.contacts?.find((ct: any) => ct.type === 'PHONE')?.value || c.contacts?.find((ct: any) => ct.type === 'PHONE')?.value || cust.mobile;
          const primaryEmail =
            cust.email || c.email || cust.contacts?.find((ct: any) => ct.type === 'EMAIL')?.value || c.contacts?.find((ct: any) => ct.type === 'EMAIL')?.value;
          return {
            customerId: cust.customerId || c.customerId || c.id || c.tenantCustomerId,
            id: cust.id || c.id || cust.customerId || c.customerId,
            fullName: cust.fullName || c.fullName || cust.name || c.name || 'Client',
            phone: primaryPhone,
            email: primaryEmail,
            totalVisits: Number(c.totalBookings ?? cust.totalBookings ?? c.totalVisits ?? 0),
            totalSpent: Number(c.totalSpent ?? cust.totalSpent ?? 0),
            tags: c.customerTags || cust.tags || c.tags || ['Salon Client'],
          };
        });
        setCustomers(normalized);
      }
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
    setIsSubmittingCustomer(true);
    try {
      const custRes = await apiRequest<any>('/api/v1/customers', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          contacts: [
            { type: 'PHONE', value: phone.trim(), isPrimary: true },
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
      setEmail('');
      loadCustomers();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Could not link customer');
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  // Open Detail Modal
  const openCustomerDetails = async (customer: CustomerDto) => {
    setSelectedCustomer(customer);
    setIsLoadingDetails(true);

    try {
      const bkRes = await apiRequest<any>(`/api/v1/customers/${customer.customerId}/bookings`);
      const bList = bkRes.items || bkRes.bookings || bkRes || [];
      setCustomerBookings(Array.isArray(bList) ? bList : []);
    } catch {
      setCustomerBookings([]);
    }

    try {
      const notesRes = await apiRequest<any>(
        `/api/v1/tenants/${DEFAULT_TENANT_ID}/customers/${customer.customerId}/notes`
      );
      const nList = notesRes.items || notesRes.notes || notesRes || [];
      setCustomerNotes(Array.isArray(nList) ? nList : []);
    } catch {
      setCustomerNotes([]);
    }

    setIsLoadingDetails(false);
  };

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !newNoteText.trim()) return;
    setIsSubmittingNote(true);
    try {
      await apiRequest(
        `/api/v1/tenants/${DEFAULT_TENANT_ID}/customers/${selectedCustomer.customerId}/notes`,
        {
          method: 'POST',
          body: JSON.stringify({ note: newNoteText.trim() }),
        }
      );
      showSuccess('Note Added', 'Client preference note saved.');
      setNewNoteText('');
      openCustomerDetails(selectedCustomer);
    } catch (err: any) {
      showError('Note Failed', err.message || 'Could not save note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Customer CRM Directory</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Client visit history, spend aggregations, loyalty points, and client preference notes.
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
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-[var(--border)]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
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
              Add a customer profile or create bookings to build your salon CRM.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Register First Client</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {customers.map((cust) => (
              <div
                key={cust.customerId}
                onClick={() => openCustomerDetails(cust)}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--muted)]/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shrink-0 border border-[var(--primary-ring)] font-bold text-xs">
                    {cust.fullName.charAt(0)}
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black text-[var(--foreground)]">{cust.fullName}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted-foreground)] font-medium">
                      {cust.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[var(--muted-foreground)]" />
                          {cust.phone}
                        </span>
                      )}
                      {cust.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[var(--muted-foreground)]" />
                          {cust.email}
                        </span>
                      )}
                    </div>
                    {cust.tags && cust.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1">
                        {cust.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--primary)] border border-[var(--border)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-xs font-bold text-[var(--muted-foreground)] block">Visits</span>
                    <span className="text-sm font-black text-[var(--foreground)]">{cust.totalVisits || 1}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-[var(--muted-foreground)] block">Total Spent</span>
                    <span className="text-sm font-black text-emerald-600">
                      ${(cust.totalSpent || 0).toFixed(2)} CAD
                    </span>
                  </div>
                </div>
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
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
            {/* Quick summary banner */}
            <div className="p-4 rounded-2xl bg-[var(--muted)] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-[var(--foreground)]">{selectedCustomer.fullName}</span>
                <span className="text-xs text-[var(--muted-foreground)] block">
                  {selectedCustomer.phone} {selectedCustomer.email ? `· ${selectedCustomer.email}` : ''}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-[var(--muted-foreground)] block">Total Spend</span>
                <span className="text-base font-black text-emerald-600">
                  ${(selectedCustomer.totalSpent || 0).toFixed(2)} CAD
                </span>
              </div>
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
                  {customerBookings.map((b) => (
                    <div key={b.bookingId || b.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[var(--foreground)] block">{b.serviceName}</span>
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          {new Date(b.startTime).toLocaleDateString()} · Specialist: {b.staffName || 'Specialist'}
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
                  {customerNotes.map((n, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs">
                      <p className="font-medium text-[var(--foreground)]">{n.note}</p>
                      <span className="text-[10px] text-[var(--muted-foreground)] mt-0.5 block">
                        {new Date(n.createdAt).toLocaleDateString()}
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
