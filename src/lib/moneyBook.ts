// Simple "Money In / Money Out" book for the shop owner.
//
// Entries are stored as ordinary double-entry journals in the backend accounting
// module, so the books stay correct for an accountant, but the owner only ever sees
// a type, an amount, a category and a note. Account selection happens here.
import { apiRequest } from '@/lib/api/client';
import { DEFAULT_BRANCH_ID } from '@/lib/api/config';
import { toList, toNumber } from '@/lib/format';

export type EntryType = 'IN' | 'OUT';
export type PaidWith = 'CASH' | 'BANK';

export interface MoneyEntry {
  id: string;
  type: EntryType;
  amount: number;
  date: string;
  category: string;
  note: string;
  paidWith: PaidWith;
}

export const INCOME_CATEGORIES = ['Services', 'Product sales', 'Tips', 'Other income'];
export const EXPENSE_CATEGORIES = ['Rent', 'Supplies', 'Utilities', 'Wages', 'Equipment', 'Other expense'];

interface Account {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  isActive?: boolean;
}

// Which ledger account each owner-facing category posts to (by account code).
const CATEGORY_ACCOUNT_CODE: Record<string, string> = {
  Services: '4000',
  'Product sales': '4000',
  Tips: '4000',
  'Other income': '4000',
  Wages: '5000',
  Rent: '5100',
  Utilities: '5200',
  Supplies: '5300',
  Equipment: '1500',
  'Other expense': '5300',
};

const CASH_CODE = '1000';
const BANK_CODE = '1010';
const NOTE_SEPARATOR = ' — ';

let accountsCache: Promise<Account[]> | null = null;

async function loadAccounts(): Promise<Account[]> {
  let list = toList<Account>(await apiRequest<any>('/api/v1/accounting/accounts'), 'accounts');
  if (list.length === 0) {
    // Brand-new tenant: create the default chart of accounts once.
    await apiRequest('/api/v1/accounting/accounts/initialize', { method: 'POST', body: '{}' });
    list = toList<Account>(await apiRequest<any>('/api/v1/accounting/accounts'), 'accounts');
  }
  return list.filter((a) => a.isActive !== false);
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

function pickAccount(accounts: Account[], code: string, fallbackType: string): Account {
  const acc =
    accounts.find((a) => a.accountCode === code) || accounts.find((a) => a.accountType === fallbackType);
  if (!acc) {
    throw new Error(`No ${fallbackType.toLowerCase()} account is set up in accounting yet.`);
  }
  return acc;
}

function isMoneyAccount(acc: { accountCode?: string } | undefined) {
  return acc?.accountCode === CASH_CODE || acc?.accountCode === BANK_CODE;
}

function cleanAccountName(name: string) {
  return name.replace(/\s+(expense|revenue|income)$/i, '').trim() || name;
}

export async function addEntry(input: {
  type: EntryType;
  amount: number;
  date: string;
  category: string;
  note?: string;
  paidWith?: PaidWith;
}): Promise<void> {
  const amount = Math.round(toNumber(input.amount) * 100) / 100;
  if (!(amount > 0)) throw new Error('Enter an amount greater than zero.');

  const accounts = await getAccounts();
  const money = pickAccount(accounts, input.paidWith === 'BANK' ? BANK_CODE : CASH_CODE, 'ASSET');
  const code = CATEGORY_ACCOUNT_CODE[input.category] || (input.type === 'IN' ? '4000' : '5300');
  const other = pickAccount(accounts, code, input.type === 'IN' ? 'REVENUE' : 'EXPENSE');

  const note = (input.note || '').trim();
  const lines =
    input.type === 'IN'
      ? [
          { accountId: money.accountId, debitAmount: amount, creditAmount: 0 },
          { accountId: other.accountId, debitAmount: 0, creditAmount: amount },
        ]
      : [
          { accountId: other.accountId, debitAmount: amount, creditAmount: 0 },
          { accountId: money.accountId, debitAmount: 0, creditAmount: amount },
        ];

  await apiRequest('/api/v1/accounting/journals', {
    method: 'POST',
    body: JSON.stringify({
      branchId: DEFAULT_BRANCH_ID,
      description: note ? `${input.category}${NOTE_SEPARATOR}${note}` : input.category,
      entryDate: input.date,
      lines,
    }),
  });
}

// Converts a backend journal into an owner-facing entry, or null when the journal
// is not income/spending (e.g. transfers, invoice settlements) or was reversed.
function journalToEntry(j: any, accountsById: Map<string, Account>): MoneyEntry | null {
  if (j.isReversed || j.reversalOfJournalId) return null;
  const lines: any[] = Array.isArray(j.lines) ? j.lines : [];
  const withAcc = lines.map((l) => ({
    debit: toNumber(l.debitAmount),
    credit: toNumber(l.creditAmount),
    acc: (l.account as Account) || accountsById.get(l.accountId),
  }));

  let incomeAmt = 0;
  let expenseAmt = 0;
  for (const l of withAcc) {
    if (l.acc?.accountType === 'REVENUE') incomeAmt += l.credit - l.debit;
    if (l.acc?.accountType === 'EXPENSE') expenseAmt += l.debit - l.credit;
  }

  const moneyLine = withAcc.find((l) => isMoneyAccount(l.acc));
  let type: EntryType;
  let amount: number;
  let categoryAcc: Account | undefined;

  if (incomeAmt > 0 && incomeAmt >= expenseAmt) {
    type = 'IN';
    amount = incomeAmt - expenseAmt;
    categoryAcc = withAcc.find((l) => l.acc?.accountType === 'REVENUE')?.acc;
  } else if (expenseAmt > 0) {
    type = 'OUT';
    amount = expenseAmt - incomeAmt;
    categoryAcc = withAcc.find((l) => l.acc?.accountType === 'EXPENSE')?.acc;
  } else if (moneyLine && moneyLine.credit > 0) {
    // Cash spent on something kept (e.g. equipment) still feels like "money out".
    const target = withAcc.find((l) => l.debit > 0 && l.acc?.accountType === 'ASSET' && !isMoneyAccount(l.acc));
    if (!target) return null;
    type = 'OUT';
    amount = moneyLine.credit;
    categoryAcc = target.acc;
  } else {
    return null;
  }

  const description: string = j.description || '';
  const knownCategories = type === 'IN' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const sepIdx = description.indexOf(NOTE_SEPARATOR);
  const head = sepIdx >= 0 ? description.slice(0, sepIdx) : description;
  let category: string;
  let note: string;
  if (knownCategories.includes(head)) {
    category = head;
    note = sepIdx >= 0 ? description.slice(sepIdx + NOTE_SEPARATOR.length) : '';
  } else {
    category = categoryAcc ? cleanAccountName(categoryAcc.accountName) : type === 'IN' ? 'Other income' : 'Other expense';
    note = description;
  }

  return {
    id: j.journalId || j.id,
    type,
    amount: Math.round(amount * 100) / 100,
    date: String(j.entryDate || j.createdAt || '').slice(0, 10),
    category,
    note,
    paidWith: moneyLine?.acc?.accountCode === BANK_CODE ? 'BANK' : 'CASH',
  };
}

export async function listEntries(from: string, to: string): Promise<MoneyEntry[]> {
  const [accounts, res] = await Promise.all([
    getAccounts().catch(() => [] as Account[]),
    apiRequest<any>(`/api/v1/accounting/journals?from=${from}&to=${to}`),
  ]);
  const accountsById = new Map(accounts.map((a) => [a.accountId, a]));
  return toList(res, 'journals')
    .map((j) => journalToEntry(j, accountsById))
    .filter((e): e is MoneyEntry => !!e && (!e.date || (e.date >= from && e.date <= to)))
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
}

// Entries are never hard-deleted: the backend reverses the journal so the audit trail stays intact.
export async function removeEntry(id: string): Promise<void> {
  await apiRequest(`/api/v1/accounting/journals/${id}/reverse`, { method: 'POST', body: '{}' });
}
