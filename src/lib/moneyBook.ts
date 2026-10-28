// Simple "Income / Expense" book for the shop owner.
//
// Entries are stored as ordinary double-entry journals in the backend accounting
// module, so the books stay correct for an accountant, but the owner only ever sees
// a type, an amount, a category (and sub-category) and a note. The HST split happens here.
//
// Categories live in the chart of accounts: each category is an account the app made
// (never one of the backend's built-in "system" accounts, which can't be renamed once
// used) and each sub-category is a child account. The owner can add, rename and remove
// them; removing only disables the account, so past entries keep their category.
import { apiRequest } from '@/lib/api/client';
import { DEFAULT_BRANCH_ID } from '@/lib/api/config';
import { BUSINESS } from '@/lib/business';
import { toList, toNumber } from '@/lib/format';

export type EntryType = 'IN' | 'OUT';
export type PaidWith = 'CASH' | 'BANK';

export interface MoneyEntry {
  id: string;
  type: EntryType;
  /** What actually changed hands, HST and tips included (negative for a refund). */
  amount: number;
  /** HST included in `amount`. */
  tax: number;
  /** Tip included in `amount`. */
  tip: number;
  date: string;
  category: string;
  subcategory: string;
  note: string;
  paidWith: PaidWith;
  /** Bill number for appointment income. */
  reference: string;
  /** Bought equipment (kept for years): not part of profit. */
  equipment: boolean;
  /** Made automatically when an appointment is billed; it can't be removed here. */
  fromAppointment: boolean;
  /** When it was written down (a real timestamp). */
  createdAt?: string;
}

export interface SubCategory {
  id: string;
  code: string;
  name: string;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  type: EntryType;
  /** Things the shop keeps for years (chairs, clippers): an asset, not a monthly expense. */
  equipment: boolean;
  /** Used by the app itself, so it can be renamed but not removed. */
  locked: boolean;
  subs: SubCategory[];
}

// Written by the app itself, not offered in the form.
export const WALK_IN_CATEGORY = 'Walk-ins';
export const SALES_TAX_CATEGORY = 'Sales tax';
export const APPOINTMENTS_CATEGORY = 'Appointments';
export const REFUNDS_CATEGORY = 'Refunds';

const CASH_CODE = '1000';
const BANK_CODE = '1010';
const SERVICE_CODE = '4000';
const TAX_CODE = '2100';
const TIPS_CODE = '4200';
const NOTE_SEPARATOR = ' — ';
const SUB_SEPARATOR = ' › ';
const MAX_SUBS = 9;

// Starting categories, made once. Removing one disables it, so it is not made again.
type Seed = { code: string; name: string; type: 'REVENUE' | 'EXPENSE' | 'ASSET'; hst: boolean; subs?: string[] };
const STARTER_CATEGORIES: Seed[] = [
  { code: '4010', name: 'Services', type: 'REVENUE', hst: true, subs: ['Haircut', 'Beard & shave', 'Other service'] },
  { code: '4110', name: 'Product sales', type: 'REVENUE', hst: true, subs: ['Hair products', 'Beard products', 'Other products'] },
  { code: '4300', name: 'Chair rental', type: 'REVENUE', hst: true },
  { code: TIPS_CODE, name: 'Tips', type: 'REVENUE', hst: false },
  { code: '4900', name: 'Other income', type: 'REVENUE', hst: false },
  { code: '5110', name: 'Rent', type: 'EXPENSE', hst: true, subs: ['Shop rent', 'Parking', 'Storage'] },
  { code: '5010', name: 'Salary', type: 'EXPENSE', hst: false, subs: ['Salary', 'Commission', 'Bonus', 'Payroll deductions (CPP/EI)'] },
  { code: '5310', name: 'Supplies', type: 'EXPENSE', hst: true, subs: ['Hair products', 'Razors & blades', 'Towels & capes', 'Cleaning', 'Disposables'] },
  { code: '1510', name: 'Equipment', type: 'ASSET', hst: true, subs: ['Barber chair', 'Clippers & trimmers', 'Dryers & tools', 'Furniture & mirrors', 'Computer & POS'] },
  { code: '5410', name: 'Repairs', type: 'EXPENSE', hst: true, subs: ['Equipment repair', 'Shop repair', 'Cleaning service'] },
  { code: '5210', name: 'Utilities', type: 'EXPENSE', hst: true, subs: ['Electricity', 'Water', 'Heating', 'Internet & phone'] },
  { code: '5510', name: 'Marketing', type: 'EXPENSE', hst: true, subs: ['Online ads', 'Printing & signs', 'Website'] },
  { code: '5610', name: 'Insurance', type: 'EXPENSE', hst: false },
  { code: '5710', name: 'Fees & licences', type: 'EXPENSE', hst: false, subs: ['Bank fees', 'Card processing', 'Licences & permits', 'Software & apps'] },
  { code: '5950', name: 'Other expense', type: 'EXPENSE', hst: false },
];
const LOCKED_CODES = [TIPS_CODE];
const isEquipmentCode = (code: string) => code >= '1500' && code < '1900';

interface Account {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  parentAccountId?: string | null;
  isActive?: boolean;
  isSystem?: boolean;
}

/** The HST inside an amount that includes it. */
export function hstIncluded(amount: number): number {
  return Math.round(((amount * BUSINESS.taxRate) / (1 + BUSINESS.taxRate)) * 100) / 100;
}

// ---- Accounts ----

let accountsCache: Promise<Account[]> | null = null;
let starterCategoriesMade: Promise<void> | null = null;

/** Every account, disabled ones included (old entries still point at them). */
async function loadAccounts(): Promise<Account[]> {
  let list = toList<Account>(await apiRequest<any>('/api/v1/accounting/accounts'), 'accounts');
  if (list.length === 0) {
    // Brand-new tenant: create the default chart of accounts once.
    await apiRequest('/api/v1/accounting/accounts/initialize', { method: 'POST', body: '{}' });
    list = toList<Account>(await apiRequest<any>('/api/v1/accounting/accounts'), 'accounts');
  }
  return list;
}

function getAccounts(): Promise<Account[]> {
  if (!accountsCache) {
    accountsCache = loadAccounts().catch((err) => {
      accountsCache = null;
      throw err;
    });
  }
  return accountsCache;
}

const isActive = (a: Account) => a.isActive !== false;

async function createAccount(code: string, name: string, type: string, parentAccountId?: string): Promise<Account> {
  const created = await apiRequest<any>('/api/v1/accounting/accounts', {
    method: 'POST',
    body: JSON.stringify({ accountCode: code, accountName: name, accountType: type, ...(parentAccountId ? { parentAccountId } : {}) }),
  });
  accountsCache = null;
  return (created?.data || created) as Account;
}

/** The account with this code, created on first use (the default chart doesn't have them all). */
async function ensureAccount(code: string, name: string, type: string): Promise<Account> {
  const found = (await getAccounts()).find((a) => a.accountCode === code);
  return found || createAccount(code, name, type);
}

function makeStarterCategories(): Promise<void> {
  if (!starterCategoriesMade) {
    starterCategoriesMade = (async () => {
      const accounts = await getAccounts();
      const codes = new Set(accounts.map((a) => a.accountCode));
      for (const seed of STARTER_CATEGORIES) {
        let parent = accounts.find((a) => a.accountCode === seed.code);
        if (!parent) parent = await createAccount(seed.code, seed.name, seed.type);
        // Sub-categories only come with a category made just now (never re-made after removal).
        if (codes.has(seed.code)) continue;
        await Promise.all(
          (seed.subs || []).map((sub, i) => createAccount(String(Number(seed.code) + i + 1), sub, seed.type, parent!.accountId))
        );
      }
    })().catch((err) => {
      starterCategoriesMade = null;
      throw err;
    });
  }
  return starterCategoriesMade;
}

function categoryType(a: Account): EntryType | null {
  if (a.accountType === 'REVENUE') return 'IN';
  if (a.accountType === 'EXPENSE') return 'OUT';
  if (a.accountType === 'ASSET' && isEquipmentCode(a.accountCode)) return 'OUT';
  return null;
}

/** The owner's income and expense categories, with their sub-categories. */
export async function listCategories(): Promise<Category[]> {
  await makeStarterCategories();
  const accounts = (await getAccounts()).filter(isActive);
  const order = (code: string) => {
    const i = STARTER_CATEGORIES.findIndex((s) => s.code === code);
    return i >= 0 ? i : 100;
  };
  return accounts
    .filter((a) => !a.parentAccountId && !a.isSystem && categoryType(a))
    .map((a) => ({
      id: a.accountId,
      code: a.accountCode,
      name: a.accountName,
      type: categoryType(a)!,
      equipment: a.accountType === 'ASSET',
      locked: LOCKED_CODES.includes(a.accountCode),
      subs: accounts
        .filter((s) => s.parentAccountId === a.accountId)
        .sort((x, y) => x.accountCode.localeCompare(y.accountCode))
        .map((s) => ({ id: s.accountId, code: s.accountCode, name: s.accountName })),
    }))
    .sort((x, y) => order(x.code) - order(y.code) || x.code.localeCompare(y.code));
}

function cleanName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

function checkName(name: string, taken: string[]) {
  if (!name) throw new Error('Type a name.');
  if (name.length > 60) throw new Error('Keep the name under 60 characters.');
  if (taken.some((t) => t.toLowerCase() === name.toLowerCase())) throw new Error(`"${name}" is already there.`);
}

export async function addCategory(input: { name: string; type: EntryType; equipment?: boolean }): Promise<void> {
  const name = cleanName(input.name);
  const all = await getAccounts();
  const current = await listCategories();
  checkName(name, current.filter((c) => c.type === input.type).map((c) => c.name));
  const accountType = input.type === 'IN' ? 'REVENUE' : input.equipment ? 'ASSET' : 'EXPENSE';
  // Categories take codes ending in 0, so each has room for 9 sub-categories after it.
  const [start, end] = accountType === 'REVENUE' ? [4000, 5000] : accountType === 'ASSET' ? [1500, 1900] : [5000, 6000];
  const used = new Set(all.map((a) => Number(a.accountCode)));
  let code = start + 10;
  while (code < end && Array.from({ length: 10 }, (_, i) => code + i).some((c) => used.has(c))) code += 10;
  if (code >= end) throw new Error('There is no room for more categories of this kind.');
  await createAccount(String(code), name, accountType);
}

export async function addSubCategory(category: Category, rawName: string): Promise<void> {
  const name = cleanName(rawName);
  checkName(name, category.subs.map((s) => s.name));
  const used = new Set((await getAccounts()).map((a) => a.accountCode));
  const base = Number(category.code);
  const free = Array.from({ length: MAX_SUBS }, (_, i) => String(base + i + 1)).find((c) => !used.has(c));
  if (!free) throw new Error(`A category can have up to ${MAX_SUBS} sub-categories.`);
  const parent = (await getAccounts()).find((a) => a.accountId === category.id);
  await createAccount(free, name, parent?.accountType || (category.type === 'IN' ? 'REVENUE' : 'EXPENSE'), category.id);
}

export async function renameCategory(id: string, rawName: string, siblings: string[]): Promise<void> {
  const name = cleanName(rawName);
  checkName(name, siblings);
  await apiRequest(`/api/v1/accounting/accounts/${id}`, { method: 'PUT', body: JSON.stringify({ accountName: name }) });
  accountsCache = null;
}

/** Removes a category (and its sub-categories) or one sub-category. Past entries keep it. */
export async function removeCategory(id: string): Promise<void> {
  const children = (await getAccounts()).filter((a) => a.parentAccountId === id && isActive(a));
  for (const c of children) {
    await apiRequest(`/api/v1/accounting/accounts/${c.accountId}/disable`, { method: 'PATCH' });
  }
  await apiRequest(`/api/v1/accounting/accounts/${id}/disable`, { method: 'PATCH' });
  accountsCache = null;
}

/** Whether the HST box starts ticked for a category: the owner's last choice, else a sensible default. */
export function defaultIncludesHst(category: Category): boolean {
  try {
    const saved = localStorage.getItem(`hst:${category.id}`);
    if (saved !== null) return saved === '1';
  } catch {}
  return STARTER_CATEGORIES.find((s) => s.code === category.code)?.hst ?? true;
}

export function rememberIncludesHst(categoryId: string, value: boolean) {
  try {
    localStorage.setItem(`hst:${categoryId}`, value ? '1' : '0');
  } catch {}
}

// ---- Entries ----

export async function addEntry(input: {
  type: EntryType;
  /** Total paid or received, HST included. */
  amount: number;
  date: string;
  /** The category, or its sub-category when one was picked. */
  category: Category;
  sub?: SubCategory | null;
  note?: string;
  paidWith?: PaidWith;
  /** HST included in `amount`. */
  tax?: number;
}): Promise<void> {
  const accounts = await getAccounts();
  const target = accounts.find((a) => a.accountId === (input.sub?.id || input.category.id));
  if (!target) throw new Error('That category was removed. Pick another one.');
  const label = `${input.category.name}${input.sub ? SUB_SEPARATOR + input.sub.name : ''}`;
  await postEntry({ ...input, account: target, label });
}

async function postEntry(input: {
  type: EntryType;
  amount: number;
  date: string;
  account: Account;
  label: string;
  note?: string;
  paidWith?: PaidWith;
  tax?: number;
}) {
  const amount = Math.round(toNumber(input.amount) * 100) / 100;
  if (!(amount > 0)) throw new Error('Enter an amount greater than zero.');
  const isTaxOnly = input.account.accountCode === TAX_CODE;
  const tax = isTaxOnly ? 0 : Math.min(amount, Math.max(0, Math.round(toNumber(input.tax) * 100) / 100));
  const bank = input.paidWith === 'BANK';
  const money = await ensureAccount(bank ? BANK_CODE : CASH_CODE, bank ? 'Bank Account' : 'Cash', 'ASSET');
  const taxAcc = tax > 0 ? await ensureAccount(TAX_CODE, 'Tax Payable', 'LIABILITY') : null;

  const side = (accountId: string, value: number, debit: boolean) =>
    debit ? { accountId, debitAmount: value, creditAmount: 0 } : { accountId, debitAmount: 0, creditAmount: value };
  const isIn = input.type === 'IN';
  const lines = [side(money.accountId, amount, isIn), side(input.account.accountId, Math.round((amount - tax) * 100) / 100, !isIn)];
  if (taxAcc) lines.push(side(taxAcc.accountId, tax, !isIn));

  const note = (input.note || '').trim();
  await apiRequest('/api/v1/accounting/journals', {
    method: 'POST',
    body: JSON.stringify({
      branchId: DEFAULT_BRANCH_ID,
      description: `${input.label}${note ? NOTE_SEPARATOR + note : ''}`,
      entryDate: input.date,
      lines,
    }),
  });
}

/** Income the app records by itself: walk-in sales, HST on a bill, and tips. */
export async function addAutoIncome(kind: 'walkIn' | 'salesTax' | 'tip', input: { amount: number; date: string; note?: string; tax?: number }) {
  const account =
    kind === 'walkIn'
      ? await ensureAccount(SERVICE_CODE, 'Service Revenue', 'REVENUE')
      : kind === 'salesTax'
        ? await ensureAccount(TAX_CODE, 'Tax Payable', 'LIABILITY')
        : await ensureAccount(TIPS_CODE, 'Tips', 'REVENUE');
  const label = kind === 'walkIn' ? WALK_IN_CATEGORY : kind === 'salesTax' ? SALES_TAX_CATEGORY : account.accountName;
  await postEntry({ type: 'IN', paidWith: 'CASH', ...input, account, label });
}

interface InvoiceInfo {
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  tip: number;
  total: number;
  notes: string;
}

const round = (n: number) => Math.round(n * 100) / 100;

// Names of the backend's built-in accounts, as the owner would say them.
function accountLabel(a: Account): string {
  if (!a.isSystem) return a.accountName;
  if (a.accountCode === SERVICE_CODE && a.accountName === 'Service Revenue') return 'Services';
  return a.accountName.replace(/\s+(expense|revenue|income)$/i, '').trim() || a.accountName;
}

// Converts a backend journal into an owner-facing entry, or null when the journal
// is not income/spending (e.g. transfers, invoice settlements) or was reversed.
function journalToEntry(j: any, accountsById: Map<string, Account>, invoices: Map<string, InvoiceInfo>): MoneyEntry | null {
  if (j.isReversed || j.reversalOfJournalId) return null;
  const lines: any[] = Array.isArray(j.lines) ? j.lines : [];
  const withAcc = lines.map((l) => ({
    debit: toNumber(l.debitAmount),
    credit: toNumber(l.creditAmount),
    acc: accountsById.get(l.accountId) || (l.account as Account),
  }));

  let incomeAmt = 0;
  let expenseAmt = 0;
  let taxNet = 0; // HST: positive when collected, negative when paid
  for (const l of withAcc) {
    if (l.acc?.accountType === 'REVENUE') incomeAmt += l.credit - l.debit;
    if (l.acc?.accountType === 'EXPENSE') expenseAmt += l.debit - l.credit;
    if (l.acc?.accountCode === TAX_CODE) taxNet += l.credit - l.debit;
  }

  const moneyLine = withAcc.find((l) => l.acc?.accountCode === CASH_CODE || l.acc?.accountCode === BANK_CODE);
  let type: EntryType;
  let amount: number;
  let tax = 0;
  let categoryAcc: Account | undefined;
  let equipment = false;

  if (incomeAmt > 0 && incomeAmt >= expenseAmt) {
    type = 'IN';
    tax = Math.max(0, taxNet);
    amount = incomeAmt - expenseAmt + tax;
    categoryAcc = withAcc.find((l) => l.acc?.accountType === 'REVENUE')?.acc;
  } else if (expenseAmt > 0) {
    type = 'OUT';
    tax = Math.max(0, -taxNet);
    amount = expenseAmt - incomeAmt + tax;
    categoryAcc = withAcc.find((l) => l.acc?.accountType === 'EXPENSE')?.acc;
  } else if (incomeAmt < 0 && moneyLine && moneyLine.credit > 0) {
    // Money given back to a customer.
    type = 'IN';
    amount = incomeAmt;
  } else if (moneyLine && moneyLine.credit > 0) {
    // Cash spent on something kept (equipment) still counts as an expense to the owner.
    const target = withAcc.find((l) => l.debit > 0 && l.acc?.accountType === 'ASSET' && l !== moneyLine);
    if (!target) return null;
    type = 'OUT';
    tax = Math.max(0, -taxNet);
    amount = moneyLine.credit;
    categoryAcc = target.acc;
    equipment = true;
  } else if (moneyLine && moneyLine.debit > 0 && taxNet > 0) {
    // HST collected on its own (see shopBookings.finishAndPay).
    type = 'IN';
    amount = taxNet;
    tax = taxNet;
  } else {
    return null;
  }

  const description: string = j.description || '';
  const invoiceMatch = description.match(/^Invoice\s+(\S+)\s+created/i);
  const sepIdx = description.indexOf(NOTE_SEPARATOR);
  const head = (sepIdx >= 0 ? description.slice(0, sepIdx) : description).split(SUB_SEPARATOR)[0];
  const noteAfterHead = sepIdx >= 0 ? description.slice(sepIdx + NOTE_SEPARATOR.length) : '';
  let category: string;
  let subcategory = '';
  let note = noteAfterHead;
  let reference = '';
  let tip = 0;

  if (invoiceMatch) {
    reference = invoiceMatch[1];
    category = APPOINTMENTS_CATEGORY;
    const inv = invoices.get(reference);
    note = inv?.notes || `Bill ${reference}`;
    if (inv) {
      tip = inv.tip;
      // Older bills leave the tax out of their total; then it was booked separately as "Sales tax".
      const taxIncluded = inv.tax > 0 && inv.total >= inv.subtotal - inv.discount + inv.tip + inv.tax - 0.01;
      if (taxIncluded && tax === 0) tax = inv.tax;
    }
  } else if (head === WALK_IN_CATEGORY || head === SALES_TAX_CATEGORY) {
    category = head;
  } else if (amount < 0) {
    category = REFUNDS_CATEGORY;
    note = description;
  } else if (categoryAcc) {
    // The account says the category, so a renamed category shows its new name on old entries too.
    const parent = categoryAcc.parentAccountId ? accountsById.get(categoryAcc.parentAccountId) : undefined;
    category = parent ? accountLabel(parent) : accountLabel(categoryAcc);
    subcategory = parent ? accountLabel(categoryAcc) : '';
  } else {
    category = type === 'IN' ? 'Other income' : 'Other expense';
    note = description;
  }
  // Older "Sales tax" entries were booked to revenue; it is still all HST.
  if (category === SALES_TAX_CATEGORY) tax = amount;
  if (categoryAcc?.accountCode === TIPS_CODE) tip = amount;

  return {
    id: j.journalId || j.id,
    type,
    amount: round(amount),
    tax: round(tax),
    tip: round(tip),
    date: String(j.entryDate || j.createdAt || '').slice(0, 10),
    category,
    subcategory,
    note,
    paidWith: moneyLine?.acc?.accountCode === BANK_CODE ? 'BANK' : 'CASH',
    reference,
    equipment,
    fromAppointment: !!invoiceMatch,
    createdAt: j.createdAt,
  };
}

async function loadInvoices(): Promise<Map<string, InvoiceInfo>> {
  const res = await apiRequest<any>('/api/v1/billing/invoices?limit=1000');
  return new Map(
    toList<any>(res, 'invoices').map((inv) => [
      String(inv.invoiceNumber),
      {
        status: String(inv.status),
        subtotal: toNumber(inv.subtotal),
        tax: toNumber(inv.taxAmount),
        discount: toNumber(inv.discountAmount),
        tip: toNumber(inv.tipAmount),
        total: toNumber(inv.total),
        notes: String(inv.notes || ''),
      },
    ])
  );
}

export async function listEntries(from: string, to: string): Promise<MoneyEntry[]> {
  const [accounts, res, invoices] = await Promise.all([
    getAccounts().catch(() => [] as Account[]),
    apiRequest<any>(`/api/v1/accounting/journals?from=${from}&to=${to}`),
    loadInvoices().catch(() => new Map<string, InvoiceInfo>()),
  ]);
  const accountsById = new Map(accounts.map((a) => [a.accountId, a]));
  return toList(res, 'journals')
    .filter((j) => {
      // The backend doesn't reverse a bill's income when the bill is voided, so those are skipped.
      const inv = String(j.description || '').match(/^Invoice\s+(\S+)\s+created/i);
      return !(inv && ['VOID', 'CANCELLED'].includes(invoices.get(inv[1])?.status || ''));
    })
    .map((j) => journalToEntry(j, accountsById, invoices))
    .filter((e): e is MoneyEntry => !!e && (!e.date || (e.date >= from && e.date <= to)))
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
}

// Entries are never hard-deleted: the backend reverses the journal so the audit trail stays intact.
export async function removeEntry(id: string): Promise<void> {
  await apiRequest(`/api/v1/accounting/journals/${id}/reverse`, { method: 'POST', body: '{}' });
}
