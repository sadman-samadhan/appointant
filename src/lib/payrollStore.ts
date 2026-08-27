import fs from 'fs';
import path from 'path';

export interface LocalPayroll {
  payrollId: string;
  tenantId?: string;
  branchId?: string;
  staffId: string;
  staffName?: string;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  totalAmount: number;
  status: 'DRAFT' | 'PAID' | 'REVERSED';
  paymentAccountId?: string | null;
  reversalReason?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

const STORE_PATH = path.join(process.cwd(), '.payroll_store.json');

function readStore(): LocalPayroll[] {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw) as LocalPayroll[];
  } catch {
    return [];
  }
}

function writeStore(items: LocalPayroll[]) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write payroll store:', err);
  }
}

export const payrollStore = {
  getAll(): LocalPayroll[] {
    return readStore();
  },

  getById(id: string): LocalPayroll | undefined {
    return readStore().find((p) => p.payrollId === id);
  },

  add(payroll: LocalPayroll): LocalPayroll {
    const items = readStore();
    const existingIdx = items.findIndex((p) => p.payrollId === payroll.payrollId);
    if (existingIdx >= 0) {
      items[existingIdx] = payroll;
    } else {
      items.unshift(payroll);
    }
    writeStore(items);
    return payroll;
  },

  update(id: string, updates: Partial<LocalPayroll>): LocalPayroll | undefined {
    const items = readStore();
    const idx = items.findIndex((p) => p.payrollId === id);
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
    const filtered = items.filter((p) => p.payrollId !== id);
    if (filtered.length !== items.length) {
      writeStore(filtered);
      return true;
    }
    return false;
  },
};
