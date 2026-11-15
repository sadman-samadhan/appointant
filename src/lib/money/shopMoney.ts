// Shared loaders for the money pages: vendors, expense categories, staff and cash/bank accounts.
// The backend's replies are read loosely (pick) so a renamed or nested field doesn't break a page.
import { apiRequest } from '@/lib/api/client';
import { DEFAULT_TENANT_ID } from '@/lib/api/config';
import { toList } from '@/lib/format';
import { pick } from '@/components/admin/kit';
import { listCategories, type Category } from '@/lib/moneyBook';

export interface Vendor {
  vendorId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  hstNumber?: string;
  notes?: string;
  isActive: boolean;
}

export function toVendor(v: any): Vendor {
  return {
    vendorId: String(pick(v, 'vendorId', 'id') ?? ''),
    name: String(pick(v, 'name', 'vendorName') ?? ''),
    contactName: pick(v, 'contactName'),
    email: pick(v, 'email'),
    phone: pick(v, 'phone'),
    hstNumber: pick(v, 'hstNumber'),
    notes: pick(v, 'notes'),
    isActive: v?.isActive !== false,
  };
}

export async function loadVendors(includeInactive = false): Promise<Vendor[]> {
  const res = await apiRequest<any>(`/api/v1/vendors${includeInactive ? '?includeInactive=true' : ''}`);
  return toList(res, 'vendors', 'items', 'data')
    .map(toVendor)
    .filter((v) => v.vendorId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface ExpenseCategory {
  categoryId: string;
  name: string;
  requiresReceipt: boolean;
  /** The Accounting category (account) its expenses are booked to. */
  accountId?: string;
}

export async function loadExpenseCategories(): Promise<ExpenseCategory[]> {
  const res = await apiRequest<any>('/api/v1/expenses/categories');
  return toList(res, 'categories', 'items', 'data')
    .map((c: any) => ({
      categoryId: String(pick(c, 'categoryId', 'expenseCategoryId', 'id') ?? ''),
      name: String(pick(c, 'categoryName', 'name') ?? ''),
      requiresReceipt: !!c?.requiresReceipt,
      accountId: pick<string>(c, 'accountId', 'account.accountId', 'glAccountId'),
    }))
    .filter((c) => c.categoryId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The categories an expense can go under are Accounting's own (Rent, Salary, Supplies, Equipment…),
 * so there is one list to manage and every expense lands in the right place in Accounting.
 */
export async function loadSpendCategories(): Promise<Category[]> {
  return (await listCategories()).filter((c) => c.type === 'OUT');
}

/**
 * The backend's expense category for an Accounting category: the one already linked to it, else
 * one with the same name (linked now), else a new linked one.
 */
export async function expenseCategoryFor(category: Category): Promise<string> {
  const existing = await loadExpenseCategories();
  const linked =
    existing.find((e) => e.accountId === category.id) ||
    existing.find((e) => e.name.trim().toLowerCase() === category.name.trim().toLowerCase());
  if (linked) {
    if (linked.accountId !== category.id) {
      await apiRequest(`/api/v1/expenses/categories/${linked.categoryId}`, {
        method: 'PUT',
        body: JSON.stringify({ accountId: category.id }),
      });
    }
    return linked.categoryId;
  }
  const created = await apiRequest<any>('/api/v1/expenses/categories', {
    method: 'POST',
    body: JSON.stringify({ categoryName: category.name, accountId: category.id }),
  });
  const id = pick<string>(created, 'categoryId', 'expenseCategoryId', 'id', 'category.categoryId');
  if (id) return String(id);
  const again = (await loadExpenseCategories()).find((e) => e.accountId === category.id);
  if (!again) throw new Error('The expense category could not be created.');
  return again.categoryId;
}

export interface StaffMember {
  staffId: string;
  fullName: string;
  roleTitle?: string;
}

export async function loadStaff(): Promise<StaffMember[]> {
  const res = await apiRequest<any>(`/api/v1/staff?tenantId=${DEFAULT_TENANT_ID}&limit=100`);
  return toList(res, 'staff', 'items', 'data')
    .filter((s: any) => s && (!s.tenantId || s.tenantId === DEFAULT_TENANT_ID) && String(s.status || 'ACTIVE').toUpperCase() !== 'INACTIVE')
    .map((s: any) => ({
      staffId: String(pick(s, 'staffId', 'id') ?? ''),
      fullName: String(pick(s, 'fullName', 'name') ?? 'Staff'),
      roleTitle: pick(s, 'roleTitle'),
    }))
    .filter((s) => s.staffId)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export interface MoneyAccount {
  accountId: string;
  name: string;
  code?: string;
}

/** Cash and bank accounts (the ASSET accounts money is paid from or into). */
export async function loadCashAccounts(): Promise<MoneyAccount[]> {
  const res = await apiRequest<any>('/api/v1/accounting/accounts');
  const all = toList(res, 'accounts', 'items', 'data').filter((a: any) => a && (a.accountId || a.id) && a.isActive !== false);
  const assets = all.filter((a: any) => String(pick(a, 'accountType', 'type') ?? '').toUpperCase() === 'ASSET');
  // Prefer the ones that look like money (cash, bank, chequing); else any asset account.
  const money = assets.filter((a: any) => /cash|bank|cheq|chequ|check|saving/i.test(String(pick(a, 'accountName', 'name') ?? '')));
  return (money.length ? money : assets).map((a: any) => ({
    accountId: String(pick(a, 'accountId', 'id')),
    name: String(pick(a, 'accountName', 'name') ?? ''),
    code: pick(a, 'accountCode', 'code'),
  }));
}

export const PAYMENT_METHODS = ['BANK_TRANSFER', 'COMPANY_CARD', 'CASH', 'PERSONAL_CARD'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  BANK_TRANSFER: 'Bank transfer',
  COMPANY_CARD: 'Shop card',
  CASH: 'Cash',
  PERSONAL_CARD: 'Personal card',
};

/** HST included in a tax-in amount at New Brunswick's 15%. */
export function hstIncluded(amount: number, rate = 0.15): number {
  return Math.round((amount - amount / (1 + rate)) * 100) / 100;
}

export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Opens a downloaded file (a pay stub PDF) in a new tab, or saves it if the browser blocks that. */
export function openBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
