'use client';

// Bank import: upload a bank statement (CSV), then sort each line: money out becomes an expense,
// money in is matched to the customer payments it deposits, and transfers are ignored.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Landmark, Upload, RefreshCw, ArrowDownLeft, ArrowUpRight, Receipt, Link2, EyeOff, Undo2, FileText } from 'lucide-react';
import { apiRequest } from '@/lib/api/client';
import { toList } from '@/lib/format';
import { useT, useMoney } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import {
  Card,
  Empty,
  Field,
  Loading,
  Modal,
  PageHeader,
  Pill,
  Stat,
  Tabs,
  errorText,
  inputClass,
  num,
  pick,
  primaryButton,
  quietButton,
} from '@/components/admin/kit';
import {
  MoneyAccount,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  PaymentMethod,
  StaffMember,
  Vendor,
  hstIncluded,
  loadCashAccounts,
  loadSpendCategories,
  expenseCategoryFor,
  loadStaff,
  loadVendors,
} from '@/lib/money/shopMoney';
import type { Category } from '@/lib/moneyBook';

type LineStatus = 'NEW' | 'IMPORTED' | 'MATCHED' | 'IGNORED';

interface Line {
  lineId: string;
  date: string;
  description: string;
  reference?: string;
  amount: number;
  balance?: number;
  status: LineStatus;
  statementId?: string;
}

interface Statement {
  statementId: string;
  fileName: string;
  uploadedAt: string;
  accountName?: string;
  lines?: number;
  skipped?: number;
}

const DATE_FORMATS = ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'] as const;

const LINE_STATUS: Record<LineStatus, { label: string; tone: 'good' | 'warn' | 'plain' | 'gold' }> = {
  NEW: { label: 'To sort', tone: 'warn' },
  IMPORTED: { label: 'Expense made', tone: 'good' },
  MATCHED: { label: 'Matched', tone: 'good' },
  IGNORED: { label: 'Ignored', tone: 'plain' },
};

function toLine(l: any): Line {
  const debit = num(l, 'debit', 'withdrawal');
  const credit = num(l, 'credit', 'deposit');
  const amount = pick(l, 'amount') !== undefined ? num(l, 'amount') : credit - debit;
  return {
    lineId: String(pick(l, 'lineId', 'bankLineId', 'id')),
    date: String(pick(l, 'transactionDate', 'date', 'postedDate') ?? '').slice(0, 10),
    description: String(pick(l, 'description', 'memo', 'details') ?? ''),
    reference: pick(l, 'reference'),
    amount,
    balance: pick(l, 'balance') !== undefined ? num(l, 'balance') : undefined,
    status: String(pick(l, 'status') ?? 'NEW').toUpperCase() as LineStatus,
    statementId: pick(l, 'statementId', 'bankStatementId'),
  };
}

function toStatement(s: any): Statement {
  return {
    statementId: String(pick(s, 'statementId', 'bankStatementId', 'id')),
    fileName: String(pick(s, 'fileName', 'originalFileName', 'name') ?? 'statement.csv'),
    uploadedAt: String(pick(s, 'uploadedAt', 'createdAt') ?? ''),
    accountName: pick(s, 'accountName', 'account.accountName'),
    lines: pick(s, 'importedCount', 'linesImported', 'lineCount', 'importedLines'),
    skipped: pick(s, 'skippedCount', 'duplicateCount', 'linesSkipped', 'skippedLines'),
  };
}

interface Payment {
  paymentId: string;
  amount: number;
  date: string;
  label: string;
}

export default function BankImportPage() {
  const { t } = useT();
  const money = useMoney();
  const { showSuccess, showError } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<'lines' | 'statements'>('lines');
  const [lines, setLines] = useState<Line[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'' | LineStatus>('NEW');
  const [statementFilter, setStatementFilter] = useState('');

  const [accounts, setAccounts] = useState<MoneyAccount[]>([]);
  // Accounting's categories: a bank line's expense lands under the same heading there.
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  // Upload
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState('');
  const [dateFormat, setDateFormat] = useState<(typeof DATE_FORMATS)[number]>('YYYY-MM-DD');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported?: number; skipped?: number } | null>(null);

  // Line → expense
  const [toExpense, setToExpense] = useState<Line | null>(null);
  const [exp, setExp] = useState({ categoryId: '', vendorId: '', vendorName: '', description: '', hstAmount: '', paymentMethod: 'BANK_TRANSFER' as PaymentMethod, staffId: '', notes: '' });
  const [savingExp, setSavingExp] = useState(false);

  // Line → payments
  const [toMatch, setToMatch] = useState<Line | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [matching, setMatching] = useState(false);
  const [busyId, setBusyId] = useState('');

  const loadLines = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      if (statementFilter) qs.set('statementId', statementFilter);
      const [l, s] = await Promise.all([
        apiRequest<any>(`/api/v1/bank-statements/lines?${qs}`),
        apiRequest<any>('/api/v1/bank-statements'),
      ]);
      const list = toList(l, 'lines', 'items', 'data').map(toLine);
      list.sort((a, b) => b.date.localeCompare(a.date));
      setLines(list);
      const st = toList(s, 'statements', 'items', 'data').map(toStatement);
      st.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
      setStatements(st);
    } catch (err) {
      showError(t('Could not load bank lines'), errorText(err, ''));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, statementFilter, showError, t]);

  useEffect(() => {
    loadLines();
  }, [loadLines]);

  useEffect(() => {
    Promise.allSettled([loadCashAccounts(), loadSpendCategories(), loadVendors(), loadStaff()]).then(([a, c, v, s]) => {
      if (a.status === 'fulfilled') {
        setAccounts(a.value);
        setAccountId((prev) => prev || a.value.find((x) => /bank|cheq|chequ/i.test(x.name))?.accountId || a.value[0]?.accountId || '');
      }
      if (c.status === 'fulfilled') setCategories(c.value);
      if (v.status === 'fulfilled') setVendors(v.value);
      if (s.status === 'fulfilled') setStaff(s.value);
    });
  }, []);

  const counts = useMemo(() => {
    const out = lines.filter((l) => l.amount < 0).reduce((s, l) => s + l.amount, 0);
    const inn = lines.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0);
    return { out: -out, inn, toSort: lines.filter((l) => l.status === 'NEW').length };
  }, [lines]);

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (accountId) fd.append('accountId', accountId);
      fd.append('dateFormat', dateFormat);
      const res = await apiRequest<any>('/api/v1/bank-statements', { method: 'POST', body: fd });
      const r = {
        imported: pick<number>(res, 'importedCount', 'linesImported', 'imported', 'statement.importedCount', 'lineCount'),
        skipped: pick<number>(res, 'skippedCount', 'duplicateCount', 'skipped', 'linesSkipped', 'statement.skippedCount'),
      };
      setResult(r);
      showSuccess(t('Statement imported'));
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setStatusFilter('NEW');
      setStatementFilter('');
      loadLines();
    } catch (err) {
      showError(t('Could not import the statement'), errorText(err, ''));
    } finally {
      setUploading(false);
    }
  };

  const openExpense = (l: Line) => {
    setToExpense(l);
    setExp({
      categoryId: '',
      vendorId: '',
      vendorName: '',
      description: l.description,
      hstAmount: '',
      paymentMethod: 'BANK_TRANSFER',
      staffId: '',
      notes: '',
    });
  };

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toExpense || !exp.categoryId) return;
    const hst = exp.hstAmount === '' ? 0 : Number(exp.hstAmount);
    if (hst < 0 || hst > Math.abs(toExpense.amount)) return showError(t('HST must be between zero and the amount'));
    const spendCat = categories.find((c) => c.id === exp.categoryId);
    if (!spendCat) return showError(t('Pick a category'));
    setSavingExp(true);
    const body: Record<string, unknown> = { paymentMethod: exp.paymentMethod };
    if (exp.description.trim()) body.description = exp.description.trim();
    if (hst > 0) body.hstAmount = hst;
    if (exp.vendorId) body.vendorId = exp.vendorId;
    else if (exp.vendorName.trim()) body.vendorName = exp.vendorName.trim();
    if (exp.staffId) body.staffId = exp.staffId;
    if (exp.notes.trim()) body.notes = exp.notes.trim();
    try {
      body.categoryId = await expenseCategoryFor(spendCat);
      await apiRequest(`/api/v1/bank-statements/lines/${toExpense.lineId}/expense`, { method: 'POST', body: JSON.stringify(body) });
      showSuccess(t('Expense made from the bank line'));
      setToExpense(null);
      loadLines();
    } catch (err) {
      showError(t('Could not make the expense'), errorText(err, ''));
    } finally {
      setSavingExp(false);
    }
  };

  const openMatch = async (l: Line) => {
    setToMatch(l);
    setPicked([]);
    setPayments([]);
    try {
      // Customer payments from the week before the deposit up to its day.
      const end = new Date(`${l.date}T12:00:00`);
      const start = new Date(end);
      start.setDate(start.getDate() - 10);
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      const res = await apiRequest<any>(`/api/v1/payments?from=${iso(start)}&to=${iso(end)}&limit=500`);
      const list = toList(res, 'payments', 'items', 'data')
        .map(
          (p: any): Payment => ({
            paymentId: String(pick(p, 'paymentId', 'id')),
            amount: num(p, 'amount', 'totalAmount'),
            date: String(pick(p, 'paidAt', 'paymentDate', 'createdAt') ?? '').slice(0, 10),
            label: String(pick(p, 'customerName', 'customer.fullName', 'method', 'paymentMethod') ?? ''),
          })
        )
        .filter((p) => p.amount > 0 && (!p.date || (p.date >= iso(start) && p.date <= iso(end))));
      list.sort((a, b) => b.date.localeCompare(a.date));
      setPayments(list);
    } catch (err) {
      showError(t('Could not load payments'), errorText(err, ''));
    }
  };

  const pickedTotal = payments.filter((p) => picked.includes(p.paymentId)).reduce((s, p) => s + p.amount, 0);

  const saveMatch = async () => {
    if (!toMatch || picked.length === 0) return;
    setMatching(true);
    try {
      await apiRequest(`/api/v1/bank-statements/lines/${toMatch.lineId}/match-payments`, {
        method: 'POST',
        body: JSON.stringify({ paymentIds: picked }),
      });
      showSuccess(t('Deposit matched'));
      setToMatch(null);
      loadLines();
    } catch (err) {
      showError(t('Could not match the deposit'), errorText(err, ''));
    } finally {
      setMatching(false);
    }
  };

  const simple = async (l: Line, action: 'ignore' | 'restore') => {
    setBusyId(l.lineId);
    try {
      await apiRequest(`/api/v1/bank-statements/lines/${l.lineId}/${action}`, { method: 'POST', body: '{}' });
      showSuccess(action === 'ignore' ? t('Line ignored') : t('Line put back to sort'));
      loadLines();
    } catch (err) {
      showError(t('That did not work'), errorText(err, ''));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Bank import')}
        subtitle={t('Upload your bank statement, then sort each line: money out becomes an expense, money in is matched to customer payments.')}
        actions={
          <>
            <Link href="/admin/expenses" className={quietButton}>
              <Receipt className="h-4 w-4" /> {t('Expenses')}
            </Link>
            <button
              onClick={() => {
                setResult(null);
                setUploadOpen(true);
              }}
              className={primaryButton}
            >
              <Upload className="h-4 w-4" /> {t('Upload statement')}
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t('To sort')} value={String(counts.toSort)} hint={t('Lines shown below')} />
        <Stat label={t('Money in')} value={money(counts.inn)} />
        <Stat label={t('Money out')} value={money(counts.out)} />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'lines', label: t('Bank lines') },
          { value: 'statements', label: t('Uploaded statements') },
        ]}
      />

      {tab === 'lines' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label={t('Show')}>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LineStatus | '')} className={inputClass}>
                <option value="">{t('All lines')}</option>
                {(Object.keys(LINE_STATUS) as LineStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {t(LINE_STATUS[s].label)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('Statement')}>
              <select value={statementFilter} onChange={(e) => setStatementFilter(e.target.value)} className={inputClass}>
                <option value="">{t('All statements')}</option>
                {statements.map((s) => (
                  <option key={s.statementId} value={s.statementId}>
                    {s.fileName}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex items-end">
              <button onClick={loadLines} className={`${quietButton} h-[42px] w-full`} aria-label={t('Refresh')}>
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <Card className="overflow-hidden">
            {loading ? (
              <Loading text={t('Loading…')} />
            ) : lines.length === 0 ? (
              <Empty
                icon={<Landmark className="h-6 w-6" />}
                title={statusFilter === 'NEW' ? t('Nothing left to sort') : t('No bank lines')}
                text={t('Upload a statement from your bank (CSV) to start.')}
                action={
                  <button onClick={() => setUploadOpen(true)} className={primaryButton}>
                    <Upload className="h-4 w-4" /> {t('Upload statement')}
                  </button>
                }
              />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {lines.map((l) => {
                  const out = l.amount < 0;
                  const st = LINE_STATUS[l.status] || LINE_STATUS.NEW;
                  const busy = busyId === l.lineId;
                  return (
                    <li key={l.lineId} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            out ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                          }`}
                        >
                          {out ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-bold text-[var(--foreground)]" dir="ltr">
                            {l.description || '—'}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            <span dir="ltr">{l.date}</span>
                            {l.reference ? (
                              <>
                                {' · '}
                                <span dir="ltr">{l.reference}</span>
                              </>
                            ) : null}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <span className={`me-2 text-sm font-bold tabular-nums ${out ? 'text-[var(--foreground)]' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {out ? '−' : '+'}
                          {money(Math.abs(l.amount))}
                        </span>
                        <Pill tone={st.tone}>{t(st.label)}</Pill>
                        {l.status === 'NEW' && out && (
                          <button onClick={() => openExpense(l)} className={primaryButton}>
                            <Receipt className="h-3.5 w-3.5" /> {t('Make expense')}
                          </button>
                        )}
                        {l.status === 'NEW' && !out && (
                          <button onClick={() => openMatch(l)} className={primaryButton}>
                            <Link2 className="h-3.5 w-3.5" /> {t('Match payments')}
                          </button>
                        )}
                        {l.status === 'NEW' && (
                          <button disabled={busy} onClick={() => simple(l, 'ignore')} className={quietButton} title={t('For transfers between your own accounts')}>
                            <EyeOff className="h-3.5 w-3.5" /> {t('Ignore')}
                          </button>
                        )}
                        {(l.status === 'IGNORED' || l.status === 'MATCHED') && (
                          <button disabled={busy} onClick={() => simple(l, 'restore')} className={quietButton}>
                            <Undo2 className="h-3.5 w-3.5" /> {t('Undo')}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      ) : (
        <Card className="overflow-hidden">
          {statements.length === 0 ? (
            <Empty icon={<FileText className="h-6 w-6" />} title={t('No statements uploaded yet')} />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {statements.map((s) => (
                <li key={s.statementId} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-[var(--primary)]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--foreground)]" dir="ltr">
                        {s.fileName}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        <span dir="ltr">{s.uploadedAt.slice(0, 10)}</span>
                        {s.accountName ? ` · ${s.accountName}` : ''}
                        {s.lines !== undefined ? ` · ${t('{n} lines', { n: s.lines })}` : ''}
                        {s.skipped ? ` · ${t('{n} already imported', { n: s.skipped })}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setStatementFilter(s.statementId);
                      setStatusFilter('');
                      setTab('lines');
                    }}
                    className={quietButton}
                  >
                    {t('See lines')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Upload */}
      <Modal
        open={uploadOpen}
        title={t('Upload statement')}
        onClose={() => setUploadOpen(false)}
        footer={
          result ? (
            <button onClick={() => setUploadOpen(false)} className={primaryButton}>
              {t('Done')}
            </button>
          ) : (
            <>
              <button onClick={() => setUploadOpen(false)} className={quietButton}>
                {t('Cancel')}
              </button>
              <button onClick={upload} disabled={!file || uploading} className={primaryButton}>
                <Upload className="h-4 w-4" /> {uploading ? t('Importing…') : t('Import')}
              </button>
            </>
          )
        }
      >
        {result ? (
          <div className="space-y-2 text-sm">
            <p className="font-bold text-[var(--foreground)]">{t('Statement imported')}</p>
            {result.imported !== undefined && <p className="text-[var(--muted-foreground)]">{t('{n} new lines to sort.', { n: result.imported })}</p>}
            {!!result.skipped && <p className="text-[var(--muted-foreground)]">{t('{n} lines were already imported and were skipped.', { n: result.skipped })}</p>}
          </div>
        ) : (
          <>
            <Field label={t('Statement file (CSV)')} hint={t('From your online banking: Date, Description and Amount columns (or Debit and Credit). Lines already imported are skipped.')}>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-[var(--muted-foreground)] file:me-3 file:rounded-md file:border-0 file:bg-[var(--primary)] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[var(--primary-foreground)]"
              />
            </Field>
            <Field label={t('Bank account')}>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
                {accounts.length === 0 && <option value="">{t('Default bank account')}</option>}
                {accounts.map((a) => (
                  <option key={a.accountId} value={a.accountId}>
                    {a.code ? `${a.code} · ` : ''}
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('Dates in the file look like')}>
              <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value as (typeof DATE_FORMATS)[number])} className={inputClass} dir="ltr">
                <option value="YYYY-MM-DD">2026-04-30</option>
                <option value="MM/DD/YYYY">04/30/2026 (month first)</option>
                <option value="DD/MM/YYYY">30/04/2026 (day first)</option>
              </select>
            </Field>
          </>
        )}
      </Modal>

      {/* Line → expense */}
      <Modal
        open={!!toExpense}
        wide
        title={t('Make expense')}
        onClose={() => setToExpense(null)}
        footer={
          <>
            <button onClick={() => setToExpense(null)} className={quietButton}>
              {t('Cancel')}
            </button>
            <button type="submit" form="line-expense" disabled={savingExp || !exp.categoryId} className={primaryButton}>
              {savingExp ? t('Saving…') : t('Make expense')}
            </button>
          </>
        }
      >
        {toExpense && (
          <form id="line-expense" onSubmit={saveExpense} className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-sm sm:col-span-2">
              <p className="font-bold text-[var(--foreground)]" dir="ltr">
                {toExpense.description}
              </p>
              <p className="text-[var(--muted-foreground)]">
                <span dir="ltr">{toExpense.date}</span> · {money(Math.abs(toExpense.amount))}
              </p>
            </div>
            <Field label={t('Category')}>
              <select required value={exp.categoryId} onChange={(e) => setExp({ ...exp, categoryId: e.target.value })} className={inputClass}>
                <option value="">{t('Choose…')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(c.name)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('Vendor')}>
              <select value={exp.vendorId} onChange={(e) => setExp({ ...exp, vendorId: e.target.value })} className={inputClass}>
                <option value="">{t('Not in the list')}</option>
                {vendors.map((v) => (
                  <option key={v.vendorId} value={v.vendorId}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
            {!exp.vendorId && (
              <Field label={t('Paid to (name)')}>
                <input value={exp.vendorName} onChange={(e) => setExp({ ...exp, vendorName: e.target.value })} className={inputClass} />
              </Field>
            )}
            <Field label={t('HST in that amount')} hint={t('Leave empty if there was no HST.')}>
              <div className="flex gap-2">
                <input type="number" step="0.01" min="0" dir="ltr" value={exp.hstAmount} onChange={(e) => setExp({ ...exp, hstAmount: e.target.value })} className={inputClass} />
                <button type="button" onClick={() => setExp({ ...exp, hstAmount: hstIncluded(Math.abs(toExpense.amount)).toFixed(2) })} className={quietButton}>
                  15%
                </button>
              </div>
            </Field>
            <Field label={t('What was it for?')} className="sm:col-span-2">
              <input value={exp.description} onChange={(e) => setExp({ ...exp, description: e.target.value })} className={inputClass} />
            </Field>
            <Field label={t('Paid with')}>
              <select value={exp.paymentMethod} onChange={(e) => setExp({ ...exp, paymentMethod: e.target.value as PaymentMethod })} className={inputClass}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(PAYMENT_METHOD_LABEL[m])}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('Spent by (staff)')}>
              <select value={exp.staffId} onChange={(e) => setExp({ ...exp, staffId: e.target.value })} className={inputClass}>
                <option value="">{t('Shop')}</option>
                {staff.map((s) => (
                  <option key={s.staffId} value={s.staffId}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </Field>
          </form>
        )}
      </Modal>

      {/* Line → payments */}
      <Modal
        open={!!toMatch}
        title={t('Match payments')}
        onClose={() => setToMatch(null)}
        footer={
          <>
            <button onClick={() => setToMatch(null)} className={quietButton}>
              {t('Cancel')}
            </button>
            <button onClick={saveMatch} disabled={matching || picked.length === 0} className={primaryButton}>
              <Link2 className="h-4 w-4" /> {matching ? t('Saving…') : t('Match')}
            </button>
          </>
        }
      >
        {toMatch && (
          <>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-sm">
              <p className="font-bold text-[var(--foreground)]" dir="ltr">
                {toMatch.description}
              </p>
              <p className="text-[var(--muted-foreground)]">
                <span dir="ltr">{toMatch.date}</span> · {money(toMatch.amount)}
              </p>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">{t('Tick the customer payments this deposit covers (a card batch can cover several).')}</p>
            {payments.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">{t('No customer payments in the 10 days before this deposit.')}</p>
            ) : (
              <ul className="max-h-72 divide-y divide-[var(--border)] overflow-y-auto rounded-lg border border-[var(--border)]">
                {payments.map((p) => (
                  <li key={p.paymentId}>
                    <label className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="accent-[var(--primary)]"
                          checked={picked.includes(p.paymentId)}
                          onChange={(e) => setPicked((prev) => (e.target.checked ? [...prev, p.paymentId] : prev.filter((x) => x !== p.paymentId)))}
                        />
                        <span>
                          <span dir="ltr">{p.date}</span>
                          {p.label ? ` · ${p.label}` : ''}
                        </span>
                      </span>
                      <span className="font-bold tabular-nums">{money(p.amount)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <p className={`text-sm font-bold ${Math.abs(pickedTotal - toMatch.amount) < 0.005 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--muted-foreground)]'}`}>
              {t('Ticked: {a} of {b}', { a: money(pickedTotal), b: money(toMatch.amount) })}
            </p>
          </>
        )}
      </Modal>
    </div>
  );
}
