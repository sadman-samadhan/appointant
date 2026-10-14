'use client';

import React, { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { apiRequest } from '@/lib/api/client';
import { DEFAULT_TENANT_ID } from '@/lib/api/config';
import { useToast } from '@/context/ToastContext';
import { toNumber } from '@/lib/format';

// Shop-wide billing settings stored on the backend (not in the browser like the theme).
export function ShopBillingSettings() {
  const { showSuccess, showError } = useToast();
  const [taxRate, setTaxRate] = useState('');
  const [footer, setFooter] = useState('');
  const [loaded, setLoaded] = useState<{ taxRate: number; footer: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apiRequest<any>(`/api/v1/tenants/${DEFAULT_TENANT_ID}/settings`)
      .then((s) => {
        const current = { taxRate: toNumber(s?.taxRate), footer: s?.receiptFooterText || '' };
        setLoaded(current);
        setTaxRate(String(current.taxRate));
        setFooter(current.footer);
      })
      .catch(() => setLoaded(null));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loaded) return;
    const rate = Number(taxRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      showError('Check the tax rate', 'Enter a percentage between 0 and 100.');
      return;
    }
    const body: Record<string, unknown> = {};
    if (rate !== loaded.taxRate) body.taxRate = Math.round(rate * 100) / 100;
    if (footer.trim() !== loaded.footer) body.receiptFooterText = footer.trim();
    if (Object.keys(body).length === 0) {
      showSuccess('No changes', 'Billing settings are already up to date.');
      return;
    }
    setIsSaving(true);
    try {
      const saved = await apiRequest<any>(`/api/v1/tenants/${DEFAULT_TENANT_ID}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      const next = { taxRate: toNumber(saved?.taxRate ?? rate), footer: saved?.receiptFooterText ?? footer.trim() };
      if ('taxRate' in body && next.taxRate !== body.taxRate) {
        throw new Error('The server did not accept the new tax rate yet. Please ask the backend team to deploy the tax-rate update.');
      }
      setLoaded(next);
      showSuccess('Billing Settings Saved', 'New bills will use these settings.');
    } catch (err: any) {
      showError('Could Not Save', err.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="glass-card p-6 rounded-2xl border border-[var(--border)] space-y-4">
      <h2 className="text-sm font-black text-[var(--foreground)] flex items-center gap-2">
        <Receipt className="w-4 h-4 text-[var(--primary)]" />
        Billing
      </h2>
      {!loaded ? (
        <p className="text-xs text-[var(--muted-foreground)]">Loading billing settings…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Sales tax (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-sm font-bold text-[var(--foreground)]"
              />
              <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                Added to every appointment. HST in New Brunswick is 15%. Use 0 if your prices already include tax.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Receipt footer</label>
              <textarea
                rows={3}
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)]"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary px-6 py-2.5 rounded-xl text-xs font-black disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save Billing Settings'}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
