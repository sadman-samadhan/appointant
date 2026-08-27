import fs from 'fs';
import path from 'path';

export interface LocalInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
}

export interface LocalInvoice {
  invoiceId: string;
  invoiceNumber?: string;
  tenantId?: string;
  branchId?: string;
  customerId: string;
  customerName?: string;
  issueDate: string;
  dueDate: string;
  items: LocalInvoiceItem[];
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  tipAmount?: number;
  totalAmount: number;
  paidAmount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'VOID' | 'CANCELLED';
  currency: string;
  notes?: string | null;
  terms?: string | null;
  createdAt: string;
  updatedAt: string;
}

const STORE_PATH = path.join(process.cwd(), '.invoices_store.json');

function readStore(): LocalInvoice[] {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw) as LocalInvoice[];
  } catch {
    return [];
  }
}

function writeStore(items: LocalInvoice[]) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write invoices store:', err);
  }
}

export const invoicesStore = {
  getAll(): LocalInvoice[] {
    return readStore();
  },

  getById(id: string): LocalInvoice | undefined {
    return readStore().find((i) => i.invoiceId === id);
  },

  add(invoice: LocalInvoice): LocalInvoice {
    const items = readStore();
    const existingIdx = items.findIndex((i) => i.invoiceId === invoice.invoiceId);
    if (existingIdx >= 0) {
      items[existingIdx] = invoice;
    } else {
      items.unshift(invoice);
    }
    writeStore(items);
    return invoice;
  },

  update(id: string, updates: Partial<LocalInvoice>): LocalInvoice | undefined {
    const items = readStore();
    const idx = items.findIndex((i) => i.invoiceId === id);
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
    const filtered = items.filter((i) => i.invoiceId !== id);
    if (filtered.length !== items.length) {
      writeStore(filtered);
      return true;
    }
    return false;
  },
};
