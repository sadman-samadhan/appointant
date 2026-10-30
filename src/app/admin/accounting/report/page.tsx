'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BUSINESS, FULL_ADDRESS } from '@/lib/business';
import { formatMoney, todayISO } from '@/lib/format';
import { listEntries } from '@/lib/moneyBook';
import { AccountantReport, ReportLine, buildReport, downloadFile, summaryCsv, transactionsCsv } from '@/lib/accountantReport';
import { ArrowLeft, Download, Printer, RefreshCw } from 'lucide-react';

type PeriodKey = 'month' | 'lastMonth' | 'quarter' | 'lastQuarter' | 'year' | 'lastYear' | 'custom';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'quarter', label: 'This quarter' },
  { key: 'lastQuarter', label: 'Last quarter' },
  { key: 'year', label: 'This year' },
  { key: 'lastYear', label: 'Last year' },
  { key: 'custom', label: 'Pick dates' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function periodRange(key: PeriodKey, now = new Date(`${todayISO()}T12:00:00`)): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const q = Math.floor(m / 3) * 3;
  switch (key) {
    case 'lastMonth':
      return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case 'quarter':
      return { from: iso(new Date(y, q, 1)), to: iso(new Date(y, q + 3, 0)) };
    case 'lastQuarter':
      return { from: iso(new Date(y, q - 3, 1)), to: iso(new Date(y, q, 0)) };
    case 'year':
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case 'lastYear':
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    default:
      return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
  }
}

const money = (n: number) => `${n < 0 ? '-' : ''}$${formatMoney(Math.abs(n))}`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-2xl border border-[var(--border)] p-5 space-y-3 break-inside-avoid print:border-0 print:p-0 print:shadow-none">
      <h2 className="text-sm font-black uppercase tracking-wide text-[var(--foreground)]">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value, strong, indent }: { label: string; value: number; strong?: boolean; indent?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 text-sm ${strong ? 'font-black border-t border-[var(--border)] pt-2' : ''} ${indent ? 'pl-5 text-xs text-[var(--muted-foreground)]' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{money(value)}</span>
    </div>
  );
}

function Lines({ lines, empty }: { lines: ReportLine[]; empty: string }) {
  if (lines.length === 0) return <p className="text-xs text-[var(--muted-foreground)]">{empty}</p>;
  return (
    <div className="space-y-1.5">
      {lines.map((l) => (
        <div key={l.name} className="space-y-1">
          <Row label={l.name} value={l.total} />
          {l.subs.map((s) => (
            <Row key={s.name} label={s.name} value={s.total} indent />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function AccountantReportPage() {
  const [periodKey, setPeriodKey] = useState<PeriodKey>('lastMonth');
  const [custom, setCustom] = useState(periodRange('month'));
  const range = periodKey === 'custom' ? custom : periodRange(periodKey);
  const [report, setReport] = useState<AccountantReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!range.from || !range.to || range.from > range.to) return;
    setIsLoading(true);
    setError(null);
    try {
      setReport(buildReport(await listEntries(range.from, range.to), range.from, range.to));
    } catch (err: any) {
      setReport(null);
      setError(err.message || 'Could not load the report.');
    } finally {
      setIsLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  const fileBase = useMemo(
    () => `${BUSINESS.shortName.replace(/\s+/g, '')}_${range.from}_to_${range.to}`,
    [range.from, range.to]
  );
  const tax = BUSINESS.taxLabel;
  const periodText = `${new Date(`${range.from}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })} – ${new Date(
    `${range.to}T12:00:00`
  ).toLocaleDateString(undefined, { dateStyle: 'medium' })}`;

  return (
    <div className="space-y-5 animate-fade-in print:space-y-6 print:text-black">
      {/* Controls (not printed) */}
      <div className="space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/accounting" className="p-2 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)]" title="Back to Accounting">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Report for accountant</h1>
              <p className="text-xs text-[var(--muted-foreground)]">Pick a period, then save it as a PDF or Excel file and send it to your accountant.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => window.print()}
              disabled={!report}
              className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" /> Save as PDF
            </button>
            <button
              onClick={() => report && downloadFile(`${fileBase}_summary.csv`, summaryCsv(report))}
              disabled={!report}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Summary (Excel)
            </button>
            <button
              onClick={() => report && downloadFile(`${fileBase}_transactions.csv`, transactionsCsv(report))}
              disabled={!report}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> All entries (Excel)
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodKey(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                periodKey === p.key
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-[var(--muted)] text-[var(--foreground)] border-[var(--border)]'
              }`}
            >
              {p.label}
            </button>
          ))}
          {periodKey === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={custom.from}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                className="px-2 py-1.5 rounded-lg bg-[var(--muted)] border border-[var(--border-strong)] font-bold text-[var(--foreground)]"
              />
              <span>to</span>
              <input
                type="date"
                value={custom.to}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                className="px-2 py-1.5 rounded-lg bg-[var(--muted)] border border-[var(--border-strong)] font-bold text-[var(--foreground)]"
              />
            </div>
          )}
          <button onClick={load} className="p-1.5 rounded-lg text-[var(--muted-foreground)]" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Report header (printed) */}
      <div className="glass-card rounded-2xl border border-[var(--border)] p-5 print:border-0 print:p-0">
        <h2 className="text-xl font-black text-[var(--foreground)]">{BUSINESS.name}</h2>
        <p className="text-xs text-[var(--muted-foreground)]">{FULL_ADDRESS}</p>
        <p className="text-xs text-[var(--muted-foreground)]">
          {BUSINESS.phoneDisplay} · {BUSINESS.email}
          {BUSINESS.hstNumber ? ` · ${tax} # ${BUSINESS.hstNumber}` : ''}
        </p>
        <p className="mt-2 text-sm font-bold text-[var(--foreground)]">Financial report · {periodText}</p>
        <p className="text-[11px] text-[var(--muted-foreground)]">
          Amounts in {BUSINESS.currency}. Income and expenses are shown before {tax}. Made {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}.
        </p>
      </div>

      {error ? (
        <p className="p-8 text-center text-sm font-bold text-rose-600">{error}</p>
      ) : !report ? (
        <p className="p-8 text-center text-xs text-[var(--muted-foreground)]">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print:grid-cols-2">
            <Section title={`Profit and loss (before ${tax})`}>
              <p className="text-xs font-bold text-emerald-600">Income</p>
              <Lines lines={report.income} empty="No income in this period." />
              <Row label="Total income" value={report.incomeTotal} strong />
              <p className="text-xs font-bold text-rose-600 pt-2">Expenses</p>
              <Lines lines={report.expenses} empty="No expenses in this period." />
              <Row label="Total expenses" value={report.expensesTotal} strong />
              <div className="pt-2">
                <Row label={report.netProfit >= 0 ? 'Net profit' : 'Net loss'} value={report.netProfit} strong />
              </div>
            </Section>

            <div className="space-y-5">
              <Section title={`${tax} summary`}>
                <Row label={`${tax} collected on sales (line 105)`} value={report.hst.collected} />
                <Row label={`${tax} paid on expenses – input tax credits (line 108)`} value={report.hst.paid} />
                <Row label={report.hst.net >= 0 ? `Net ${tax} owing (line 109)` : `Net ${tax} refund (line 109)`} value={Math.abs(report.hst.net)} strong />
              </Section>

              <Section title={`Equipment bought (before ${tax})`}>
                {report.equipment.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)]">No equipment bought in this period.</p>
                ) : (
                  <>
                    {report.equipment.map((e) => (
                      <Row key={e.id} label={`${e.date} · ${[e.subcategory, e.note].filter(Boolean).join(' · ') || 'Equipment'}`} value={e.amount - e.tax} />
                    ))}
                    <Row label="Total equipment" value={report.equipmentTotal} strong />
                  </>
                )}
                <p className="text-[11px] text-[var(--muted-foreground)]">Not counted in profit: your accountant writes it off over several years.</p>
              </Section>

              <Section title="Money received and paid">
                <Row label="Appointment bills paid" value={report.money.appointments} />
                <Row label="Cash received (appointments included)" value={report.money.cashIn} />
                <Row label="Card / bank received (appointments included)" value={report.money.bankIn} />
                <Row label="Cash paid out" value={report.money.cashOut} />
                <Row label="Bank paid out" value={report.money.bankOut} />
              </Section>
            </div>
          </div>

          <Section title={`All entries (${report.entries.length})`}>
            {report.entries.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]">Nothing recorded in this period.</p>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5 print:mx-0 print:px-0 print:overflow-visible">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)]">
                      <th className="py-2 pr-3 font-bold">Date</th>
                      <th className="py-2 pr-3 font-bold">Category</th>
                      <th className="py-2 pr-3 font-bold">Description</th>
                      <th className="py-2 pr-3 font-bold text-right">Before {tax}</th>
                      <th className="py-2 pr-3 font-bold text-right">{tax}</th>
                      <th className="py-2 pr-3 font-bold text-right">Tip</th>
                      <th className="py-2 font-bold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {report.entries.map((e) => (
                      <tr key={e.id} className="text-[var(--foreground)] break-inside-avoid">
                        <td className="py-1.5 pr-3 whitespace-nowrap">{e.date}</td>
                        <td className="py-1.5 pr-3">
                          <span className={e.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}>{e.type === 'IN' ? 'Income' : 'Expense'}</span>
                          {' · '}
                          {e.category}
                          {e.subcategory ? ` › ${e.subcategory}` : ''}
                        </td>
                        <td className="py-1.5 pr-3">
                          {e.note}
                          {e.reference && !e.note.includes(e.reference) ? ` (${e.reference})` : ''}
                        </td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{formatMoney(e.amount - e.tax - e.tip)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{formatMoney(e.tax)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{formatMoney(e.tip)}</td>
                        <td className="py-1.5 text-right tabular-nums font-bold">
                          {e.type === 'OUT' ? '-' : ''}
                          {formatMoney(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
