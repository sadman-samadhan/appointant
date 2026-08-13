'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_TENANT_ID } from '@/lib/api/config';
import { UserCheck, Plus, Search, Mail, Phone, Tag, Award } from 'lucide-react';
import { CustomerDto } from '@/lib/types';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+1 (506) 555-0199');
  const [email, setEmail] = useState('');
  const { showSuccess, showError } = useToast();

  const loadCustomers = async () => {
    try {
      const res = await apiRequest<any>(`/api/v1/tenants/${DEFAULT_TENANT_ID}/customers`);
      setCustomers(res.items || res.customers || []);
    } catch {
      setCustomers([
        { customerId: 'cust-1', fullName: 'Sarah Jenkins', email: 'sarah.j@example.com', phone: '+1 (506) 555-0144', totalVisits: 8, totalSpent: 304.0, tags: ['VIP Gold', 'Regular'] },
        { customerId: 'cust-2', fullName: 'Michael Vance', email: 'michael.v@example.com', phone: '+1 (506) 555-0188', totalVisits: 4, totalSpent: 100.0, tags: ['Barber Client'] },
        { customerId: 'cust-3', fullName: 'Alex Mercer', email: 'alex.m@example.com', phone: '+1 (506) 555-0199', totalVisits: 2, totalSpent: 50.0, tags: ['New Client'] },
      ]);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest(`/api/v1/tenants/${DEFAULT_TENANT_ID}/customers`, {
        method: 'POST',
        body: JSON.stringify({ fullName, phone, email }),
      });
      showSuccess('Customer Added', `${fullName} linked to salon directory.`);
      setShowAddModal(false);
      setFullName('');
      loadCustomers();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Could not link customer');
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').includes(searchTerm) ||
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Customer CRM Directory</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Client visit history, spent balances, and loyalty tags.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Add Client</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-4 rounded-2xl">
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
      <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)] divide-y divide-[var(--border)]">
        {filteredCustomers.map((cust) => (
          <div key={cust.customerId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                      <span key={tag} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--primary)]">
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
            <button type="submit" className="btn-primary px-5 py-2 rounded-xl text-xs font-bold">
              Save Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
