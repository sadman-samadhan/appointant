'use client';

// Vendors: who the shop pays (suppliers, landlord, utilities). Expenses and bank lines link to them.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Search, Pencil, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/api/client';
import { loadVendors, type Vendor } from '@/lib/money/shopMoney';
import { useT } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import {
  Card,
  Empty,
  Field,
  Loading,
  Modal,
  PageHeader,
  Pill,
  dangerButton,
  errorText,
  inputClass,
  primaryButton,
  quietButton,
} from '@/components/admin/kit';

const EMPTY = { name: '', contactName: '', email: '', phone: '', hstNumber: '', notes: '' };

export default function VendorsPage() {
  const { t } = useT();
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVendors(await loadVendors(showInactive));
    } catch (err) {
      showError(t('Could not load vendors'), errorText(err, ''));
    } finally {
      setLoading(false);
    }
  }, [showInactive, showError, t]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) => [v.name, v.contactName, v.email, v.phone].some((x) => x?.toLowerCase().includes(q)));
  }, [vendors, query]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (v: Vendor) => {
    setEditing(v);
    setForm({
      name: v.name,
      contactName: v.contactName || '',
      email: v.email || '',
      phone: v.phone || '',
      hstNumber: v.hstNumber || '',
      notes: v.notes || '',
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    // Send only what's filled in; empty optional fields are left out.
    const body: Record<string, string> = {};
    for (const [k, v] of Object.entries(form)) if (v.trim()) body[k] = v.trim();
    try {
      if (editing) {
        await apiRequest(`/api/v1/vendors/${editing.vendorId}`, { method: 'PUT', body: JSON.stringify(body) });
        showSuccess(t('Vendor saved'));
      } else {
        await apiRequest('/api/v1/vendors', { method: 'POST', body: JSON.stringify(body) });
        showSuccess(t('Vendor added'));
      }
      setOpen(false);
      load();
    } catch (err) {
      showError(t('Could not save the vendor'), errorText(err, ''));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (v: Vendor) => {
    const ok = await confirm({
      title: t('Remove vendor'),
      message: t('Remove {name}? If expenses use this vendor it is only switched off, so past records keep it.', { name: v.name }),
      confirmLabel: t('Remove'),
      danger: true,
      cancelLabel: t('Cancel'),
    });
    if (!ok) return;
    try {
      await apiRequest(`/api/v1/vendors/${v.vendorId}`, { method: 'DELETE' });
      showSuccess(t('Vendor removed'));
      setOpen(false);
      load();
    } catch (err) {
      showError(t('Could not remove the vendor'), errorText(err, ''));
    }
  };

  const reactivate = async (v: Vendor) => {
    try {
      await apiRequest(`/api/v1/vendors/${v.vendorId}`, { method: 'PUT', body: JSON.stringify({ isActive: true }) });
      showSuccess(t('Vendor switched back on'));
      load();
    } catch (err) {
      showError(t('Could not save the vendor'), errorText(err, ''));
    }
  };

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Vendors')}
        subtitle={t('Everyone the shop pays: suppliers, landlord, utilities. Expenses and bank lines link to them.')}
        actions={
          <>
            <button onClick={load} className={quietButton} aria-label={t('Refresh')}>
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={openNew} className={primaryButton}>
              <Plus className="h-4 w-4" /> {t('Add vendor')}
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Search vendors')}
            className={`${inputClass} ps-9`}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="accent-[var(--primary)]" />
          {t('Show switched-off vendors')}
        </label>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <Loading text={t('Loading…')} />
        ) : shown.length === 0 ? (
          <Empty
            icon={<Building2 className="h-6 w-6" />}
            title={query ? t('No vendors match') : t('No vendors yet')}
            text={query ? undefined : t('Add the businesses you pay, so expenses show who was paid.')}
            action={
              !query && (
                <button onClick={openNew} className={primaryButton}>
                  <Plus className="h-4 w-4" /> {t('Add vendor')}
                </button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {shown.map((v) => (
              <li key={v.vendorId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)] font-display text-sm font-bold text-[var(--primary)]">
                    {v.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                      <span className="truncate">{v.name}</span>
                      {!v.isActive && <Pill>{t('Switched off')}</Pill>}
                    </p>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">
                      {[v.contactName, v.phone, v.email].filter(Boolean).join(' · ') || t('No contact details')}
                    </p>
                    {v.hstNumber && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {t('HST number')}: <span dir="ltr">{v.hstNumber}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!v.isActive && (
                    <button onClick={() => reactivate(v)} className={quietButton}>
                      {t('Switch on')}
                    </button>
                  )}
                  <button onClick={() => openEdit(v)} className={quietButton}>
                    <Pencil className="h-3.5 w-3.5" /> {t('Edit')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        title={editing ? t('Edit vendor') : t('Add vendor')}
        onClose={() => setOpen(false)}
        footer={
          <>
            {editing && editing.isActive && (
              <button type="button" onClick={() => remove(editing)} className={`${dangerButton} me-auto`}>
                {t('Remove')}
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} className={quietButton}>
              {t('Cancel')}
            </button>
            <button type="submit" form="vendor-form" disabled={saving || !form.name.trim()} className={primaryButton}>
              {saving ? t('Saving…') : t('Save')}
            </button>
          </>
        }
      >
        <form id="vendor-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label={t('Business name')} className="sm:col-span-2">
            <input required value={form.name} onChange={set('name')} className={inputClass} placeholder="e.g. Saint John Energy" />
          </Field>
          <Field label={t('Contact person')}>
            <input value={form.contactName} onChange={set('contactName')} className={inputClass} />
          </Field>
          <Field label={t('Phone')}>
            <input type="tel" dir="ltr" value={form.phone} onChange={set('phone')} className={inputClass} />
          </Field>
          <Field label={t('Email')}>
            <input type="email" dir="ltr" value={form.email} onChange={set('email')} className={inputClass} />
          </Field>
          <Field label={t('HST number')} hint={t('Needed to claim back the HST you paid them.')}>
            <input dir="ltr" value={form.hstNumber} onChange={set('hstNumber')} className={inputClass} placeholder="123456789 RT0001" />
          </Field>
          <Field label={t('Notes')} className="sm:col-span-2">
            <textarea rows={3} value={form.notes} onChange={set('notes')} className={inputClass} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
