'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID } from '@/lib/api/config';
import { Scissors, Plus, Clock, Tag, Edit, Trash2, CheckCircle2, FolderPlus, Layers, PlusCircle } from 'lucide-react';
import { ServiceDto, ServiceCategoryDto, ServiceAddonDto } from '@/lib/types';
import { formatMoney, servicePrice, serviceDuration, toNumber, toList } from '@/lib/format';
import { ensureCapacityRule } from '@/lib/availability';
import { useConfirm } from '@/context/ConfirmContext';

export default function AdminServicesPage() {
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();

  const [services, setServices] = useState<ServiceDto[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Add/Edit Service Modal States
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceDto | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('25.00');
  const [baseDurationMinutes, setBaseDurationMinutes] = useState('30');
  const [serviceCategoryId, setServiceCategoryId] = useState('');
  const [isSubmittingService, setIsSubmittingService] = useState(false);

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  // Addons Modal State
  const [selectedServiceForAddons, setSelectedServiceForAddons] = useState<ServiceDto | null>(null);
  const [addonsList, setAddonsList] = useState<ServiceAddonDto[]>([]);
  const [addonName, setAddonName] = useState('');
  const [addonPrice, setAddonPrice] = useState('10.00');
  const [addonDuration, setAddonDuration] = useState('15');
  const [isSubmittingAddon, setIsSubmittingAddon] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const res = await apiRequest<any>(`/api/v1/service-categories/branches/${DEFAULT_BRANCH_ID}`);
      const list: ServiceCategoryDto[] = toList<any>(res, 'categories')
        .filter((c: any) => c && (c.categoryId || c.id))
        .map((c: any) => ({ ...c, categoryId: c.categoryId || c.id, name: c.name || 'Category' }));
      setCategories(list);
    } catch {
      setCategories([]);
    }
  }, []);

  const loadServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<any>(`/api/v1/services/branches/${DEFAULT_BRANCH_ID}`);
      const list = toList<any>(res, 'services').filter(
        (s: any) => s && (s.serviceId || s.id) && s.status !== 'ARCHIVED'
      );
      const normalized: ServiceDto[] = list.map((s: any) => ({
        serviceId: s.serviceId || s.id,
        name: s.name || 'Service',
        description: s.description,
        price: servicePrice(s),
        basePrice: servicePrice(s),
        durationMinutes: serviceDuration(s),
        baseDurationMinutes: serviceDuration(s),
        categoryId: s.categoryId || s.category?.categoryId || s.category?.id,
        categoryName: s.categoryName || s.category?.name,
        status: s.status || 'ACTIVE',
        currency: s.currency || 'CAD',
      }));
      setServices(normalized);
    } catch (err: any) {
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadServices();
  }, [loadCategories, loadServices]);

  // Handle Create or Update Service
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingService(true);
    try {
      if (editingService) {
        await apiRequest(`/api/v1/services/${editingService.serviceId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            basePrice: toNumber(basePrice),
            baseDurationMinutes: toNumber(baseDurationMinutes, 30),
            categoryId: serviceCategoryId || undefined,
          }),
        });
        showSuccess('Service Updated', `${name} updated in catalog.`);
      } else {
        const created = await apiRequest<any>('/api/v1/services', {
          method: 'POST',
          body: JSON.stringify({
            tenantId: DEFAULT_TENANT_ID,
            branchId: DEFAULT_BRANCH_ID,
            categoryId: serviceCategoryId || undefined,
            name: name.trim(),
            description: description.trim(),
            baseDurationMinutes: toNumber(baseDurationMinutes, 30),
            basePrice: toNumber(basePrice),
            currency: 'CAD',
            isOnlineBookable: true,
            requiresStaff: false,
            bookingType: 'APPOINTMENT',
          }),
        });
        const createdId = created?.serviceId || created?.id;
        if (createdId) {
          await ensureCapacityRule(createdId).catch(() => {
            /* retried when the service is activated */
          });
        }
        showSuccess('Service Created', `${name} added as a draft. Activate it to make it bookable.`);
      }
      setShowServiceModal(false);
      setEditingService(null);
      setName('');
      setDescription('');
      loadServices();
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Could not save service.');
    } finally {
      setIsSubmittingService(false);
    }
  };

  // New services are created as DRAFT and are hidden from customers until activated.
  const handleActivateService = async (serviceId: string, serviceTitle: string) => {
    try {
      await apiRequest(`/api/v1/services/${serviceId}/activate`, { method: 'POST' });
      await ensureCapacityRule(serviceId);
      showSuccess('Service Activated', `${serviceTitle} is now available for booking.`);
      loadServices();
    } catch (err: any) {
      showError('Activation Failed', err?.message || 'Could not activate service.');
    }
  };

  const handleDeleteService = async (serviceId: string, serviceTitle: string) => {
    if (!(await confirm({ title: 'Remove service', message: `Remove "${serviceTitle}" from the menu?`, confirmLabel: 'Remove', danger: true }))) return;
    try {
      await apiRequest(`/api/v1/services/${serviceId}`, { method: 'DELETE' });
      showSuccess('Service Removed', `${serviceTitle} deleted from catalog.`);
      loadServices();
    } catch (err: any) {
      showError('Delete Failed', err?.message || 'Could not delete service.');
    }
  };

  // Handle Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCat(true);
    try {
      await apiRequest('/api/v1/service-categories', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: DEFAULT_TENANT_ID,
          branchId: DEFAULT_BRANCH_ID,
          name: categoryName.trim(),
          description: categoryDescription.trim() || undefined,
        }),
      });
      showSuccess('Category Created', `${categoryName} created successfully.`);
      setShowCategoryModal(false);
      setCategoryName('');
      setCategoryDescription('');
      loadCategories();
    } catch (err: any) {
      showError('Category Failed', err?.message || 'Could not create category.');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  // Category delete workflow
  const handleDeleteCategory = async (categoryId: string) => {
    if (!(await confirm({ title: 'Delete category', message: 'Delete this service category?', confirmLabel: 'Delete', danger: true }))) return;
    try {
      await apiRequest(`/api/v1/service-categories/${categoryId}`, { method: 'DELETE' });
      showSuccess('Category Deleted', 'Service category removed.');
      loadCategories();
    } catch (err: any) {
      showError('Delete Failed', err?.message || 'Could not delete category.');
    }
  };

  // Addons workflow
  const openAddonsModal = async (service: ServiceDto) => {
    setSelectedServiceForAddons(service);
    try {
      const res = await apiRequest<any>(`/api/v1/services/${service.serviceId}/addons`);
      const items = toList(res, 'addons');
      setAddonsList(
        items.map((ad: any) => ({
          addonId: ad.addonId || ad.id,
          serviceId: ad.serviceId || service.serviceId,
          name: ad.name,
          price: toNumber(ad.additionalPrice ?? ad.price),
          durationMinutes: toNumber(ad.additionalDuration ?? ad.durationMinutes),
          isOptional: ad.isOptional,
        }))
      );
    } catch {
      setAddonsList([]);
    }
  };

  const handleCreateAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceForAddons) return;
    setIsSubmittingAddon(true);
    try {
      await apiRequest(`/api/v1/services/${selectedServiceForAddons.serviceId}/addons`, {
        method: 'POST',
        body: JSON.stringify({
          name: addonName.trim(),
          additionalPrice: toNumber(addonPrice),
          additionalDuration: toNumber(addonDuration),
          isOptional: true,
        }),
      });
      showSuccess('Addon Attached', `${addonName} added to ${selectedServiceForAddons.name}.`);
      setAddonName('');
      openAddonsModal(selectedServiceForAddons);
    } catch (err: any) {
      showError('Addon Failed', err?.message || 'Could not add addon.');
    } finally {
      setIsSubmittingAddon(false);
    }
  };

  const handleDeleteAddon = async (addonId: string) => {
    if (!selectedServiceForAddons) return;
    try {
      await apiRequest(`/api/v1/services/${selectedServiceForAddons.serviceId}/addons/${addonId}`, {
        method: 'DELETE',
      });
      showSuccess('Addon Removed', 'Addon removed.');
      openAddonsModal(selectedServiceForAddons);
    } catch (err: any) {
      showError('Failed', err?.message || 'Could not delete addon.');
    }
  };

  const filteredServices = services.filter((s) => {
    if (selectedCategoryId === 'ALL') return true;
    return s.categoryId === selectedCategoryId;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Services Catalog</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Manage salon service offerings, pricing, durations, categories, and addons.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] transition-colors flex items-center gap-1.5 border border-[var(--border)]"
          >
            <FolderPlus className="w-4 h-4 text-[var(--primary)]" />
            <span>New Category</span>
          </button>
          <button
            onClick={() => {
              setEditingService(null);
              setName('');
              setDescription('');
              setBasePrice('25.00');
              setBaseDurationMinutes('30');
              setServiceCategoryId(categories[0]?.categoryId || '');
              setShowServiceModal(true);
            }}
            className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {/* Category Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[var(--border)]">
        <button
          onClick={() => setSelectedCategoryId('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedCategoryId === 'ALL'
              ? 'bg-[var(--primary)] text-white shadow-sm font-black'
              : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:text-[var(--foreground)]'
          }`}
        >
          All Services ({services.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.categoryId}
            onClick={() => setSelectedCategoryId(cat.categoryId)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedCategoryId === cat.categoryId
                ? 'bg-[var(--primary)] text-white shadow-sm font-black'
                : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:text-[var(--foreground)]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">Loading service catalog...</div>
      ) : filteredServices.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3 rounded-2xl border border-[var(--border)]">
          <Scissors className="w-10 h-10 text-[var(--muted-foreground)] mx-auto opacity-40" />
          <h3 className="text-sm font-bold text-[var(--foreground)]">No services found</h3>
          <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
            {selectedCategoryId === 'ALL'
              ? 'Add your first salon service to populate the booking catalog.'
              : 'No services in this category.'}
          </p>
          <button
            onClick={() => {
              setEditingService(null);
              setName('');
              setDescription('');
              setBasePrice('25.00');
              setBaseDurationMinutes('30');
              setShowServiceModal(true);
            }}
            className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Service</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((srv) => (
            <div
              key={srv.serviceId}
              className="glass-card p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:shadow-md transition-all border border-[var(--border)]"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary-ring)]">
                    {srv.categoryName || 'General'}
                  </span>
                  <span className="text-base font-black text-[var(--foreground)]">
                    ${formatMoney(srv.price)} {srv.currency || 'CAD'}
                  </span>
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
                  {srv.status && srv.status !== 'ACTIVE' && (
                    <span className="ml-1 text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-[var(--muted)] border border-[var(--border)]">
                      {srv.status}
                    </span>
                  )}
                </span>

                <div className="flex items-center gap-1">
                  {srv.status && srv.status !== 'ACTIVE' && (
                    <button
                      onClick={() => handleActivateService(srv.serviceId, srv.name)}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      title="Activate Service (make bookable)"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openAddonsModal(srv)}
                    className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                    title="Manage Addons"
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingService(srv);
                      setName(srv.name);
                      setDescription(srv.description || '');
                      setBasePrice(formatMoney(srv.price));
                      setBaseDurationMinutes(String(srv.durationMinutes ?? 30));
                      setServiceCategoryId(srv.categoryId || '');
                      setShowServiceModal(true);
                    }}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    title="Edit Service"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(srv.serviceId, srv.name)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="Delete Service"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Service Modal */}
      <Modal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        title={editingService ? `Edit Service: ${editingService.name}` : 'Create New Service Offering'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveService} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Service Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Precision Skin Fade"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Detailed service description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Price (CAD $)</label>
              <input
                type="number"
                step="0.01"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Duration (Minutes)</label>
              <input
                type="number"
                required
                value={baseDurationMinutes}
                onChange={(e) => setBaseDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Category</label>
            <select
              value={serviceCategoryId}
              onChange={(e) => setServiceCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
            >
              <option value="">No Category / General</option>
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowServiceModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingService}
              className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingService ? 'Saving...' : editingService ? 'Update Service' : 'Save Service'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Manage Service Categories"
        maxWidth="md"
      >
        <div className="space-y-5">
          {/* Existing Categories */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-[var(--foreground)]">Existing Categories ({categories.length})</h4>
            {categories.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] p-3 rounded-xl bg-[var(--muted)] text-center">
                No categories created for this branch yet.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] overflow-hidden max-h-48 overflow-y-auto">
                {categories.map((cat) => (
                  <div key={cat.categoryId} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[var(--foreground)] block">{cat.name}</span>
                      {cat.description && (
                        <span className="text-[11px] text-[var(--muted-foreground)]">{cat.description}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat.categoryId)}
                      className="p-1 rounded-lg text-rose-600 hover:bg-rose-50"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create New Category Form */}
          <form onSubmit={handleCreateCategory} className="p-4 rounded-2xl bg-[var(--muted)] space-y-3">
            <h4 className="text-xs font-black text-[var(--foreground)] flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-[var(--primary)]" />
              <span>Create New Category</span>
            </h4>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Category Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Hair, Beard & Shave, Facial"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Precision haircutting and hair treatments"
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--card)] text-[var(--foreground)]"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmittingCat}
                className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {isSubmittingCat ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Addons Management Modal */}
      {selectedServiceForAddons && (
        <Modal
          isOpen={!!selectedServiceForAddons}
          onClose={() => setSelectedServiceForAddons(null)}
          title={`Service Addons — ${selectedServiceForAddons.name}`}
          maxWidth="md"
        >
          <div className="space-y-5">
            {/* List of existing addons */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-[var(--foreground)]">Existing Addons</h4>
              {addonsList.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)] p-3 rounded-xl bg-[var(--muted)] text-center">
                  No addons attached to this service yet.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] overflow-hidden">
                  {addonsList.map((ad) => (
                    <div key={ad.addonId} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[var(--foreground)] block">{ad.name}</span>
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          +{ad.durationMinutes} mins · ${formatMoney(ad.price)} CAD
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteAddon(ad.addonId)}
                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-50"
                        title="Remove Addon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add new addon form */}
            <form onSubmit={handleCreateAddon} className="p-4 rounded-2xl bg-[var(--muted)] space-y-3">
              <h4 className="text-xs font-black text-[var(--foreground)] flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-[var(--primary)]" />
                <span>Attach New Addon</span>
              </h4>

              <input
                type="text"
                required
                placeholder="Addon Title (e.g. Hot Oil Treatment)"
                value={addonName}
                onChange={(e) => setAddonName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Price CAD"
                  value={addonPrice}
                  onChange={(e) => setAddonPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
                />
                <input
                  type="number"
                  required
                  placeholder="Duration (mins)"
                  value={addonDuration}
                  onChange={(e) => setAddonDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingAddon}
                  className="btn-primary px-4 py-2 rounded-xl text-xs font-bold"
                >
                  {isSubmittingAddon ? 'Adding...' : 'Attach Addon'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
