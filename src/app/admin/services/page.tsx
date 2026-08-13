'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_BRANCH_ID } from '@/lib/api/config';
import { Scissors, Plus, Clock, Tag, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { ServiceDto } from '@/lib/types';

const INITIAL_BDIAMOND_SERVICES: ServiceDto[] = [
  { serviceId: 'srv-1', name: 'Haircut Service', description: 'Classic precision haircut with styling.', price: 23.0, durationMinutes: 30, categoryName: 'Hair Cut', status: 'ACTIVE' },
  { serviceId: 'srv-2', name: 'Fade Haircut Service', description: 'Skin fade, taper fade, or burst fade with line up.', price: 25.0, durationMinutes: 30, categoryName: 'Hair Cut', status: 'ACTIVE' },
  { serviceId: 'srv-3', name: 'Haircut & Beard Trim Combo', description: 'Full haircut and detailed beard trim shaping.', price: 38.0, durationMinutes: 30, categoryName: 'Combo', status: 'ACTIVE' },
  { serviceId: 'srv-4', name: 'Hot Towel Shave', description: 'Traditional hot towel straight razor shave.', price: 25.0, durationMinutes: 30, categoryName: 'Shave', status: 'ACTIVE' },
  { serviceId: 'srv-5', name: 'Haircut & Hot Shave Combo', description: 'Signature haircut plus relaxing hot towel shave.', price: 40.0, durationMinutes: 30, categoryName: 'Combo', status: 'ACTIVE' },
  { serviceId: 'srv-6', name: 'Beard Trim Service', description: 'Beard shaping, razor line up, and oil treatment.', price: 22.0, durationMinutes: 30, categoryName: 'Beard', status: 'ACTIVE' },
  { serviceId: 'srv-7', name: 'Senior Haircut Service (65+)', description: 'Specialized haircut for seniors 65 and over.', price: 20.0, durationMinutes: 30, categoryName: 'Specialty', status: 'ACTIVE' },
  { serviceId: 'srv-8', name: 'Kids Haircut (Under 10)', description: 'Fun and patient haircut service for children.', price: 20.0, durationMinutes: 30, categoryName: 'Specialty', status: 'ACTIVE' },
  { serviceId: 'srv-9', name: 'Face Waxing Service', description: 'Eyebrow, nose, or ear waxing detailing.', price: 15.0, durationMinutes: 30, categoryName: 'Waxing', status: 'ACTIVE' },
];

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceDto[]>(INITIAL_BDIAMOND_SERVICES);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('25.00');
  const [duration, setDuration] = useState('30');
  const [categoryName, setCategoryName] = useState('Hair Cut');
  const { showSuccess, showError } = useToast();

  const loadServices = async () => {
    try {
      const res = await apiRequest<any>(`/api/v1/services/branches/${DEFAULT_BRANCH_ID}`);
      const list: ServiceDto[] = res.items || res.services || [];
      if (list.length > 0) setServices(list);
    } catch {
      /* Keep initial B Diamond setmore catalog */
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/v1/services', {
        method: 'POST',
        body: JSON.stringify({
          name,
          price: parseFloat(price),
          durationMinutes: parseInt(duration, 10),
          categoryName,
          status: 'ACTIVE',
        }),
      });
      showSuccess('Service Added', `${name} created in catalog.`);
      setShowAddModal(false);
      setName('');
      loadServices();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Failed to add service');
    }
  };

  const categories = ['ALL', ...Array.from(new Set(services.map((s) => s.categoryName || 'Other')))];

  const filteredServices = services.filter((s) => {
    return selectedCategory === 'ALL' || s.categoryName === selectedCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Services Catalog</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Directory of salon offerings, durations, and CAD pricing.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Service</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedCategory === cat
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:text-[var(--foreground)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((srv) => (
          <div
            key={srv.serviceId}
            className="glass-card p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:shadow-md transition-all border border-[var(--border)]"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-start gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
                  {srv.categoryName || 'General'}
                </span>
                <span className="text-base font-black text-[var(--foreground)]">${srv.price.toFixed(2)} CAD</span>
              </div>
              <h3 className="text-sm font-black text-[var(--foreground)] leading-tight">{srv.name}</h3>
              {srv.description && (
                <p className="text-xs text-[var(--muted-foreground)] font-medium line-clamp-2 leading-relaxed">
                  {srv.description}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)] font-semibold">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                {srv.durationMinutes} mins
              </span>
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Service Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Service to Catalog"
        maxWidth="md"
      >
        <form onSubmit={handleAddService} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Service Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Deluxe Beard Styling"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Price (CAD $)</label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Duration (Minutes)</label>
              <input
                type="number"
                required
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Category</label>
            <input
              type="text"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none"
            />
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
              Save Service
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
