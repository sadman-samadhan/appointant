// Period report for the shop's accountant: profit and loss before HST, an HST summary
// (the figures for the GST/HST return), equipment bought, cash vs bank, and every entry.
// Built from the same entries the Accounting page shows (see moneyBook.listEntries).
import { BUSINESS } from '@/lib/business';
import { MoneyEntry, SALES_TAX_CATEGORY } from '@/lib/moneyBook';

export interface ReportLine {
  name: string;
  total: number;
  subs: { name: string; total: number }[];
}

export interface AccountantReport {
  from: string;
  to: string;
  income: ReportLine[];
  incomeTotal: number;
  expenses: ReportLine[];
  expensesTotal: number;
  netProfit: number;
  equipment: MoneyEntry[];
  equipmentTotal: number;
  hst: { collected: number; paid: number; net: number };
  money: { appointments: number; cashIn: number; cashOut: number; bankIn: number; bankOut: number };
  entries: MoneyEntry[];
}

const round = (n: number) => Math.round(n * 100) / 100;
const isEquipment = (e: MoneyEntry) => e.equipment;

function group(items: { category: string; subcategory: string; value: number }[]): ReportLine[] {
  const map = new Map<string, Map<string, number>>();
  for (const it of items) {
    if (Math.abs(it.value) < 0.005) continue;
    const subs = map.get(it.category) || new Map<string, number>();
    subs.set(it.subcategory, (subs.get(it.subcategory) || 0) + it.value);
    map.set(it.category, subs);
  }
  return Array.from(map.entries())
    .map(([name, subs]) => {
      const list = Array.from(subs.entries()).map(([sub, total]) => ({ name: sub || 'General', total: round(total) }));
      return {
        name,
        total: round(list.reduce((s, x) => s + x.total, 0)),
        // A single "General" line adds nothing to the category total.
        subs: list.length === 1 && list[0].name === 'General' ? [] : list.sort((a, b) => b.total - a.total),
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function buildReport(all: MoneyEntry[], from: string, to: string): AccountantReport {
  const entries = all.filter((e) => e.date >= from && e.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  const incomeEntries = entries.filter((e) => e.type === 'IN');
  const outEntries = entries.filter((e) => e.type === 'OUT');
  const equipment = outEntries.filter(isEquipment);

  const income = group([
    ...incomeEntries
      .filter((e) => e.category !== SALES_TAX_CATEGORY)
      .map((e) => ({ category: e.category, subcategory: e.subcategory, value: e.amount - e.tax - e.tip })),
    // Tips from appointments are part of the bill; they are shown on their own line.
    ...incomeEntries.map((e) => ({ category: 'Tips', subcategory: '', value: e.tip })),
  ]);
  const expenses = group(
    outEntries.filter((e) => !isEquipment(e)).map((e) => ({ category: e.category, subcategory: e.subcategory, value: e.amount - e.tax }))
  );
  const incomeTotal = round(income.reduce((s, l) => s + l.total, 0));
  const expensesTotal = round(expenses.reduce((s, l) => s + l.total, 0));
  const collected = round(incomeEntries.reduce((s, e) => s + e.tax, 0));
  const paid = round(outEntries.reduce((s, e) => s + e.tax, 0));
  // Refunds are income entries with a negative amount: money paid out.
  const paidIn = incomeEntries.filter((e) => e.amount > 0);
  const paidOut = [...outEntries, ...incomeEntries.filter((e) => e.amount < 0)];
  const sumBy = (list: MoneyEntry[], how: 'CASH' | 'BANK') =>
    round(list.filter((e) => !e.fromAppointment && e.paidWith === how).reduce((s, e) => s + Math.abs(e.amount), 0));

  return {
    from,
    to,
    income,
    incomeTotal,
    expenses,
    expensesTotal,
    netProfit: round(incomeTotal - expensesTotal),
    equipment,
    equipmentTotal: round(equipment.reduce((s, e) => s + e.amount - e.tax, 0)),
    hst: { collected, paid, net: round(collected - paid) },
    money: {
      appointments: round(incomeEntries.filter((e) => e.fromAppointment).reduce((s, e) => s + e.amount, 0)),
      cashIn: sumBy(paidIn, 'CASH'),
      cashOut: sumBy(paidOut, 'CASH'),
      bankIn: sumBy(paidIn, 'BANK'),
      bankOut: sumBy(paidOut, 'BANK'),
    },
    entries,
  };
}

// ---- Spreadsheet (CSV) downloads ----

function csvCell(value: string | number): string {
  const text = typeof value === 'number' ? value.toFixed(2) : value;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: (string | number)[][]): string {
  // The byte-order mark makes Excel read accents and symbols correctly.
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export function transactionsCsv(r: AccountantReport): string {
  const tax = BUSINESS.taxLabel;
  return toCsv([
    ['Date', 'Type', 'Category', 'Sub-category', 'Description', 'Reference', 'Paid with', 'Taken by', `Amount before ${tax}`, tax, 'Tip', 'Total'],
    ...r.entries.map((e) => [
      e.date,
      e.type === 'IN' ? 'Income' : 'Expense',
      e.category,
      e.subcategory,
      e.note,
      e.reference,
      e.fromAppointment ? 'Appointment bill' : e.paidWith === 'BANK' ? 'Bank' : 'Cash',
      e.takenBy,
      e.amount - e.tax - e.tip,
      e.tax,
      e.tip,
      e.amount,
    ]),
  ]);
}

export function summaryCsv(r: AccountantReport): string {
  const tax = BUSINESS.taxLabel;
  const lines = (list: ReportLine[]) =>
    list.flatMap((l) => [[l.name, '', l.total], ...l.subs.map((s) => ['', s.name, s.total])]) as (string | number)[][];
  return toCsv([
    [BUSINESS.name],
    [`Period: ${r.from} to ${r.to}`],
    ...(BUSINESS.hstNumber ? [[`${tax} number: ${BUSINESS.hstNumber}`]] : []),
    [],
    [`PROFIT AND LOSS (before ${tax})`],
    ['Income', 'Sub-category', 'Amount'],
    ...lines(r.income),
    ['Total income', '', r.incomeTotal],
    [],
    ['Expenses', 'Sub-category', 'Amount'],
    ...lines(r.expenses),
    ['Total expenses', '', r.expensesTotal],
    [],
    ['Net profit', '', r.netProfit],
    [],
    [`EQUIPMENT BOUGHT (not in profit; before ${tax})`],
    ['Date', 'Item', 'Amount'],
    ...r.equipment.map((e) => [e.date, [e.subcategory, e.note].filter(Boolean).join(' · ') || 'Equipment', e.amount - e.tax]),
    ['Total equipment', '', r.equipmentTotal],
    [],
    [`${tax} SUMMARY`],
    [`${tax} collected on sales (line 105)`, '', r.hst.collected],
    [`${tax} paid on expenses / input tax credits (line 108)`, '', r.hst.paid],
    [`Net ${tax} ${r.hst.net >= 0 ? 'owing' : 'refund'} (line 109)`, '', Math.abs(r.hst.net)],
    [],
    ['MONEY RECEIVED AND PAID'],
    ['Appointment bills paid', '', r.money.appointments],
    ['Cash received', '', r.money.cashIn],
    ['Cash paid out', '', r.money.cashOut],
    ['Bank received', '', r.money.bankIn],
    ['Bank paid out', '', r.money.bankOut],
  ]);
}

export function downloadFile(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
