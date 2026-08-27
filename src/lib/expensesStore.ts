import fs from 'fs';
import path from 'path';

export interface LocalExpense {
  expenseId: string;
  tenantId?: string;
  branchId?: string;
  staffId: string;
  categoryId: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  paymentMethod: 'CASH' | 'PERSONAL_CARD' | 'COMPANY_CARD' | 'BANK_TRANSFER';
  receiptNumber?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

const STORE_PATH = path.join(process.cwd(), '.expenses_store.json');

function readStore(): LocalExpense[] {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw) as LocalExpense[];
  } catch {
    return [];
  }
}

function writeStore(items: LocalExpense[]) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write expense store:', err);
  }
}

export const expensesStore = {
  getAll(): LocalExpense[] {
    return readStore();
  },

  getById(id: string): LocalExpense | undefined {
    return readStore().find((e) => e.expenseId === id);
  },

  add(expense: LocalExpense): LocalExpense {
    const items = readStore();
    const existingIdx = items.findIndex((e) => e.expenseId === expense.expenseId);
    if (existingIdx >= 0) {
      items[existingIdx] = expense;
    } else {
      items.unshift(expense);
    }
    writeStore(items);
    return expense;
  },

  update(id: string, updates: Partial<LocalExpense>): LocalExpense | undefined {
    const items = readStore();
    const idx = items.findIndex((e) => e.expenseId === id);
    if (idx < 0) return undefined;
    items[idx] = {
      ...items[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    writeStore(items);
    return items[idx];
  },

  delete(id: string): boolean {
    const items = readStore();
    const filtered = items.filter((e) => e.expenseId !== id);
    if (filtered.length !== items.length) {
      writeStore(filtered);
      return true;
    }
    return false;
  },
};
