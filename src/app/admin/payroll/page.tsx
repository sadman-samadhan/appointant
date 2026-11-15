'use client';

// Payroll (Canada, New Brunswick). Each barber's pay settings (hourly and/or commission, pay
// frequency, TD1 claims) live on the server, which works out CPP, EI, income tax and vacation pay
// for every cheque. This page sets those up, runs pay, pays it, prints pay stubs and shows the
// year-to-date and T4 totals.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, Plus, RefreshCw, FileDown, Settings2, Wallet, Undo2, Trash2, CalendarRange } from 'lucide-react';
import { apiDownload, apiRequest } from '@/lib/api/client';
import { toList } from '@/lib/format';
import { useT, useMoney } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
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
  dangerButton,
  errorText,
  inputClass,
  num,
  pick,
  primaryButton,
  quietButton,
} from '@/components/admin/kit';
import { MoneyAccount, StaffMember, loadCashAccounts, loadStaff, openBlob, todayLocal } from '@/lib/money/shopMoney';

type PayType = 'HOURLY' | 'COMMISSION' | 'HOURLY_PLUS_COMMISSION';
type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'SEMI_MONTHLY' | 'MONTHLY';
type PayStatus = 'DRAFT' | 'PAID' | 'REVERSED';

interface PaySettings {
  staffId: string;
  payType: PayType;
  hourlyRate?: number;
  commissionRate?: number;
  payFrequency: Frequency;
  province: 'NB';
  federalClaimAmount?: number | null;
  provincialClaimAmount?: number | null;
  vacationPayRate?: number;
  cppExempt?: boolean;
  eiExempt?: boolean;
}

interface PayRun {
  payrollId: string;
  staffId: string;
  staffName?: string;
  periodStart: string;
  periodEnd: string;
  payDate?: string;
  status: PayStatus;
  gross: number;
  net: number;
  deductions: number;
  raw: any;
}

const PAY_TYPE_LABEL: Record<PayType, string> = {
  HOURLY: 'Hourly',
  COMMISSION: 'Commission',
  HOURLY_PLUS_COMMISSION: 'Hourly + commission',
};
const FREQ_LABEL: Record<Frequency, string> = {
  WEEKLY: 'Every week',
  BIWEEKLY: 'Every two weeks',
  SEMI_MONTHLY: 'Twice a month',
  MONTHLY: 'Monthly',
};
const STATUS_TONE: Record<PayStatus, 'good' | 'plain' | 'bad'> = { DRAFT: 'plain', PAID: 'good', REVERSED: 'bad' };
const STATUS_LABEL: Record<PayStatus, string> = { DRAFT: 'Not paid yet', PAID: 'Paid', REVERSED: 'Reversed' };

// The amounts a cheque may carry, in pay stub order. Only those the server returns are shown.
const EARNINGS: [string, string[]][] = [
  ['Hours worked', ['hoursWorked']],
  ['Hourly pay', ['hourlyPay', 'regularPay', 'wages', 'breakdown.hourlyPay']],
  ['Commission', ['commissionPay', 'commissionAmount', 'commission', 'breakdown.commissionPay']],
  ['Bonus', ['bonus']],
  ['Vacation pay', ['vacationPay', 'breakdown.vacationPay']],
  ['Base salary', ['baseSalary']],
];
const DEDUCTIONS: [string, string[]][] = [
  ['CPP', ['cpp', 'cppContribution', 'cppEmployee', 'deductionsBreakdown.cpp', 'breakdown.cpp']],
  ['CPP2', ['cpp2', 'cpp2Contribution', 'breakdown.cpp2']],
  ['EI', ['ei', 'eiPremium', 'eiEmployee', 'deductionsBreakdown.ei', 'breakdown.ei']],
  ['Federal income tax', ['federalTax', 'federalIncomeTax', 'breakdown.federalTax']],
  ['NB income tax', ['provincialTax', 'provincialIncomeTax', 'nbTax', 'breakdown.provincialTax']],
];
const EMPLOYER: [string, string[]][] = [
  ['Shop’s CPP', ['employerCpp', 'cppEmployer', 'employerCppContribution', 'breakdown.employerCpp']],
  ['Shop’s CPP2', ['employerCpp2', 'breakdown.employerCpp2']],
  ['Shop’s EI', ['employerEi', 'eiEmployer', 'employerEiPremium', 'breakdown.employerEi']],
];

function present(raw: any, rows: [string, string[]][]) {
  return rows
    // A worked-out run already lists hourly pay, commission and vacation pay; its "base salary" is just their sum.
    .filter(([label]) => !(label === 'Base salary' && raw?.isCalculated))
    .map(([label, keys]) => [label, pick(raw, ...keys)] as const)
    .filter(([, v]) => v !== undefined && Number(v) !== 0) as [string, number][];
}

function toRun(p: any): PayRun {
  return {
    payrollId: String(pick(p, 'payrollId', 'id')),
    staffId: String(pick(p, 'staffId', 'staff.staffId') ?? ''),
    staffName: pick(p, 'staffName', 'staff.fullName'),
    periodStart: String(pick(p, 'periodStart') ?? '').slice(0, 10),
    periodEnd: String(pick(p, 'periodEnd') ?? '').slice(0, 10),
    payDate: pick<string>(p, 'payDate')?.slice(0, 10),
    status: String(pick(p, 'status') ?? 'DRAFT').toUpperCase() as PayStatus,
    gross: num(p, 'grossPay', 'gross', 'grossAmount', 'totalEarnings'),
    net: num(p, 'netPay', 'netSalary', 'net', 'netAmount', 'totalAmount'),
    deductions: num(p, 'totalDeductions', 'deductions'),
    raw: p,
  };
}

function toSettings(s: any): PaySettings | null {
  const staffId = pick<string>(s, 'staffId');
  if (!staffId) return null;
  return {
    staffId,
    payType: (pick(s, 'payType') ?? 'HOURLY') as PayType,
    hourlyRate: pick(s, 'hourlyRate') !== undefined ? num(s, 'hourlyRate') : undefined,
    commissionRate: pick(s, 'commissionRate') !== undefined ? num(s, 'commissionRate') : undefined,
    payFrequency: (pick(s, 'payFrequency') ?? 'BIWEEKLY') as Frequency,
    province: 'NB',
    federalClaimAmount: pick(s, 'federalClaimAmount') ?? null,
    provincialClaimAmount: pick(s, 'provincialClaimAmount') ?? null,
    vacationPayRate: pick(s, 'vacationPayRate') !== undefined ? num(s, 'vacationPayRate') : undefined,
    cppExempt: !!s?.cppExempt,
    eiExempt: !!s?.eiExempt,
  };
}

const humanize = (k: string) =>
  k
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\bCpp\b/g, 'CPP')
    .replace(/\bEi\b/g, 'EI')
    .replace(/\bYtd\b/g, 'YTD');

/** Number fields of a reply, flattened one level, for the year-to-date and T4 boxes. */
function numberFields(obj: any): [string, number][] {
  const out: [string, number][] = [];
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)) && !/id$|Id$|year|date/i.test(k))) {
      if (!/id$|Id$/.test(k)) out.push([k, Number(v)]);
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [k2, v2] of Object.entries(v)) if (typeof v2 === 'number') out.push([`${k2}`, v2]);
    }
  }
  return out;
}

const EMPTY_SETTINGS = {
  payType: 'COMMISSION' as PayType,
  hourlyRate: '',
  commissionRate: '50',
  payFrequency: 'BIWEEKLY' as Frequency,
  federalClaimAmount: '',
  provincialClaimAmount: '',
  vacationPayRate: '4',
  cppExempt: false,
  eiExempt: false,
};

export default function PayrollPage() {
  const { t } = useT();
  const money = useMoney();
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState<'runs' | 'settings' | 'year'>('runs');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [settings, setSettings] = useState<Record<string, PaySettings>>({});
  const [runs, setRuns] = useState<PayRun[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  // New pay run
  const [runOpen, setRunOpen] = useState(false);
  const [run, setRun] = useState({ staffId: '', periodStart: '', periodEnd: '', payDate: '', hoursWorked: '', commissionSales: '', bonus: '', baseSalary: '', deductions: '', notes: '' });
  const [savingRun, setSavingRun] = useState(false);

  // Detail / pay
  const [detail, setDetail] = useState<PayRun | null>(null);
  const [payAccount, setPayAccount] = useState('');
  const [busy, setBusy] = useState(false);

  // Settings editor
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(EMPTY_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);

  // Year
  const [ytd, setYtd] = useState<Record<string, any>>({});
  const [t4, setT4] = useState<any>(null);
  const [yearLoading, setYearLoading] = useState(false);

  const staffName = useCallback((id: string, fallback?: string) => staff.find((s) => s.staffId === id)?.fullName || fallback || t('Staff'), [staff, t]);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, ps, pr, acc] = await Promise.allSettled([
      loadStaff(),
      apiRequest<any>('/api/v1/payroll-settings'),
      apiRequest<any>('/api/v1/payroll'),
      loadCashAccounts(),
    ]);
    if (s.status === 'fulfilled') setStaff(s.value);
    if (ps.status === 'fulfilled') {
      const map: Record<string, PaySettings> = {};
      for (const row of toList(ps.value, 'settings', 'items', 'data', 'paySettings')) {
        const st = toSettings(row);
        if (st) map[st.staffId] = st;
      }
      setSettings(map);
    }
    if (pr.status === 'fulfilled') {
      const list = toList(pr.value, 'payroll', 'payrolls', 'items', 'data').map(toRun);
      list.sort((a, b) => (b.payDate || b.periodEnd).localeCompare(a.payDate || a.periodEnd));
      setRuns(list);
    } else {
      showError(t('Could not load payroll'), errorText(pr.reason, ''));
    }
    if (acc.status === 'fulfilled') {
      setAccounts(acc.value);
      setPayAccount((prev) => prev || acc.value.find((a) => /bank|cheq|chequ/i.test(a.name))?.accountId || acc.value[0]?.accountId || '');
    }
    setLoading(false);
  }, [showError, t]);

  useEffect(() => {
    load();
  }, [load]);

  const loadYear = useCallback(async () => {
    setYearLoading(true);
    try {
      const [t4Res, ...ytds] = await Promise.allSettled([
        apiRequest<any>(`/api/v1/payroll/t4-summary?year=${year}`),
        ...staff.map((s) => apiRequest<any>(`/api/v1/payroll/ytd/${s.staffId}?year=${year}`)),
      ]);
      setT4(t4Res.status === 'fulfilled' ? t4Res.value : null);
      const map: Record<string, any> = {};
      staff.forEach((s, i) => {
        const r = ytds[i];
        if (r && r.status === 'fulfilled') map[s.staffId] = r.value;
      });
      setYtd(map);
    } finally {
      setYearLoading(false);
    }
  }, [staff, year]);

  useEffect(() => {
    if (tab === 'year' && staff.length) loadYear();
  }, [tab, loadYear, staff.length]);

  const totals = useMemo(() => {
    const thisYear = runs.filter((r) => r.status === 'PAID' && (r.payDate || r.periodEnd).startsWith(String(new Date().getFullYear())));
    return {
      gross: thisYear.reduce((s, r) => s + r.gross, 0),
      net: thisYear.reduce((s, r) => s + r.net, 0),
      unpaid: runs.filter((r) => r.status === 'DRAFT').length,
    };
  }, [runs]);

  // ---- Pay runs ----
  const openRun = (staffId = '') => {
    const end = todayLocal();
    const d = new Date();
    d.setDate(d.getDate() - 13);
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setRun({ staffId: staffId || staff[0]?.staffId || '', periodStart: start, periodEnd: end, payDate: end, hoursWorked: '', commissionSales: '', bonus: '', baseSalary: '', deductions: '', notes: '' });
    setRunOpen(true);
  };

  const runSettings = settings[run.staffId];
  const needsHours = runSettings && runSettings.payType !== 'COMMISSION';
  const needsSales = runSettings && runSettings.payType !== 'HOURLY';

  const saveRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!run.staffId) return;
    if (run.periodEnd < run.periodStart) return showError(t('The period ends before it starts'));
    const body: Record<string, unknown> = { staffId: run.staffId, periodStart: run.periodStart, periodEnd: run.periodEnd };
    if (run.payDate) body.payDate = run.payDate;
    const n = (v: string) => (v === '' ? undefined : Number(v));
    if (runSettings) {
      if (needsHours) body.hoursWorked = n(run.hoursWorked) ?? 0;
      if (needsSales) body.commissionSales = n(run.commissionSales) ?? 0;
    } else {
      body.baseSalary = n(run.baseSalary) ?? 0;
      if (run.deductions) body.deductions = n(run.deductions);
    }
    if (run.bonus) body.bonus = n(run.bonus);
    if (run.notes.trim()) body.notes = run.notes.trim();
    setSavingRun(true);
    try {
      const created = await apiRequest<any>('/api/v1/payroll', { method: 'POST', body: JSON.stringify(body) });
      showSuccess(t('Pay worked out'), t('Check it, then pay it.'));
      setRunOpen(false);
      await load();
      const id = pick<string>(created, 'payrollId', 'id');
      if (id) {
        const fresh = await apiRequest<any>(`/api/v1/payroll/${id}`).catch(() => created);
        setDetail(toRun(fresh));
      }
    } catch (err) {
      showError(t('Could not work out the pay'), errorText(err, ''));
    } finally {
      setSavingRun(false);
    }
  };

  const openDetail = async (r: PayRun) => {
    setDetail(r);
    try {
      setDetail(toRun(await apiRequest<any>(`/api/v1/payroll/${r.payrollId}`)));
    } catch {
      /* keep the list's copy */
    }
  };

  const pay = async () => {
    if (!detail || !payAccount) return;
    setBusy(true);
    try {
      await apiRequest(`/api/v1/payroll/${detail.payrollId}/pay`, { method: 'POST', body: JSON.stringify({ paymentAccountId: payAccount }) });
      showSuccess(t('Paid'), t('The pay stub is ready to download.'));
      await load();
      setDetail(toRun(await apiRequest<any>(`/api/v1/payroll/${detail.payrollId}`).catch(() => detail.raw)));
    } catch (err) {
      showError(t('Could not pay'), errorText(err, ''));
    } finally {
      setBusy(false);
    }
  };

  const reverse = async () => {
    if (!detail) return;
    if (!(await confirm({ title: t('Reverse payment'), message: t('Undo this payment? The books are corrected and the cheque shows as reversed.'), confirmLabel: t('Reverse'), danger: true, cancelLabel: t('Cancel') }))) return;
    setBusy(true);
    try {
      await apiRequest(`/api/v1/payroll/${detail.payrollId}/reverse`, { method: 'POST', body: JSON.stringify({ reason: 'Reversed from the shop manager' }) });
      showSuccess(t('Payment reversed'));
      setDetail(null);
      load();
    } catch (err) {
      showError(t('Could not reverse'), errorText(err, ''));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!detail) return;
    if (!(await confirm({ title: t('Delete pay run'), message: t('Delete this unpaid pay run?'), confirmLabel: t('Delete'), danger: true, cancelLabel: t('Cancel') }))) return;
    setBusy(true);
    try {
      await apiRequest(`/api/v1/payroll/${detail.payrollId}`, { method: 'DELETE' });
      showSuccess(t('Pay run deleted'));
      setDetail(null);
      load();
    } catch (err) {
      showError(t('Could not delete'), errorText(err, ''));
    } finally {
      setBusy(false);
    }
  };

  const stub = async (r: PayRun) => {
    try {
      const blob = await apiDownload(`/api/v1/payroll/${r.payrollId}/stub.pdf`);
      openBlob(blob, `pay-stub-${staffName(r.staffId, r.staffName).replace(/\s+/g, '-')}-${r.periodEnd}.pdf`);
    } catch (err) {
      showError(t('Could not get the pay stub'), errorText(err, ''));
    }
  };

  // ---- Settings ----
  const openSettings = (s: StaffMember) => {
    const cur = settings[s.staffId];
    setEditStaff(s);
    setForm(
      cur
        ? {
            payType: cur.payType,
            hourlyRate: cur.hourlyRate !== undefined ? String(cur.hourlyRate) : '',
            commissionRate: cur.commissionRate !== undefined ? String(cur.commissionRate) : '',
            payFrequency: cur.payFrequency,
            federalClaimAmount: cur.federalClaimAmount != null ? String(cur.federalClaimAmount) : '',
            provincialClaimAmount: cur.provincialClaimAmount != null ? String(cur.provincialClaimAmount) : '',
            vacationPayRate: cur.vacationPayRate !== undefined ? String(cur.vacationPayRate) : '4',
            cppExempt: !!cur.cppExempt,
            eiExempt: !!cur.eiExempt,
          }
        : EMPTY_SETTINGS
    );
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStaff) return;
    const body: Record<string, unknown> = { payType: form.payType, payFrequency: form.payFrequency, province: 'NB', cppExempt: form.cppExempt, eiExempt: form.eiExempt };
    if (form.payType !== 'COMMISSION') {
      if (!(Number(form.hourlyRate) > 0)) return showError(t('Enter the hourly rate'));
      body.hourlyRate = Number(form.hourlyRate);
    }
    if (form.payType !== 'HOURLY') {
      const c = Number(form.commissionRate);
      if (!(c > 0 && c <= 100)) return showError(t('Commission must be between 1 and 100%'));
      body.commissionRate = c;
    }
    if (form.vacationPayRate !== '') body.vacationPayRate = Number(form.vacationPayRate);
    if (form.federalClaimAmount !== '') body.federalClaimAmount = Number(form.federalClaimAmount);
    if (form.provincialClaimAmount !== '') body.provincialClaimAmount = Number(form.provincialClaimAmount);
    setSavingSettings(true);
    try {
      await apiRequest(`/api/v1/payroll-settings/${editStaff.staffId}`, { method: 'PUT', body: JSON.stringify(body) });
      showSuccess(t('Pay settings saved'));
      setEditStaff(null);
      load();
    } catch (err) {
      showError(t('Could not save the pay settings'), errorText(err, ''));
    } finally {
      setSavingSettings(false);
    }
  };

  const describe = (s?: PaySettings) => {
    if (!s) return t('Not set up: pay is entered by hand');
    const parts: string[] = [t(PAY_TYPE_LABEL[s.payType])];
    if (s.hourlyRate) parts.push(t('{a} an hour', { a: money(s.hourlyRate) }));
    if (s.commissionRate) parts.push(t('{n}% commission', { n: s.commissionRate }));
    parts.push(t(FREQ_LABEL[s.payFrequency]));
    return parts.join(' · ');
  };

  const t4Employees = t4 ? toList(t4, 'employees', 'slips', 'items', 'data') : [];
  const t4Totals = t4 ? pick(t4, 'totals', 'summary', 't4Summary') : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Payroll')}
        subtitle={t('Pay for your barbers with CPP, EI and income tax worked out for New Brunswick, pay stubs and year-end T4 totals.')}
        actions={
          <>
            <button onClick={load} className={quietButton} aria-label={t('Refresh')}>
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={() => openRun()} disabled={staff.length === 0} className={primaryButton}>
              <Plus className="h-4 w-4" /> {t('Run pay')}
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t('Gross pay this year')} value={money(totals.gross)} />
        <Stat label={t('Take-home pay this year')} value={money(totals.net)} />
        <Stat label={t('Not paid yet')} value={String(totals.unpaid)} hint={t('Pay runs waiting')} />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'runs', label: t('Pay runs') },
          { value: 'settings', label: t('Pay settings') },
          { value: 'year', label: t('Year to date & T4') },
        ]}
      />

      {loading ? (
        <Card>
          <Loading text={t('Loading…')} />
        </Card>
      ) : tab === 'runs' ? (
        <Card className="overflow-hidden">
          {runs.length === 0 ? (
            <Empty
              icon={<Briefcase className="h-6 w-6" />}
              title={t('No pay runs yet')}
              text={t('Set up each barber’s pay first, then run pay for a period.')}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <button onClick={() => setTab('settings')} className={quietButton}>
                    <Settings2 className="h-4 w-4" /> {t('Pay settings')}
                  </button>
                  <button onClick={() => openRun()} disabled={staff.length === 0} className={primaryButton}>
                    <Plus className="h-4 w-4" /> {t('Run pay')}
                  </button>
                </div>
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {runs.map((r) => (
                <li key={r.payrollId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <button onClick={() => openDetail(r)} className="flex min-w-0 items-center gap-3 text-start">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)] font-display text-sm font-bold text-[var(--primary)]">
                      {staffName(r.staffId, r.staffName).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--foreground)]">{staffName(r.staffId, r.staffName)}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        <span dir="ltr">
                          {r.periodStart} → {r.periodEnd}
                        </span>
                        {r.gross ? ` · ${t('Gross')} ${money(r.gross)}` : ''}
                      </p>
                    </div>
                  </button>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="me-1 text-sm font-bold tabular-nums text-[var(--foreground)]">{money(r.net)}</span>
                    <Pill tone={STATUS_TONE[r.status]}>{t(STATUS_LABEL[r.status] || r.status)}</Pill>
                    {r.status === 'PAID' && (
                      <button onClick={() => stub(r)} className={quietButton}>
                        <FileDown className="h-3.5 w-3.5" /> {t('Pay stub')}
                      </button>
                    )}
                    <button onClick={() => openDetail(r)} className={r.status === 'DRAFT' ? primaryButton : quietButton}>
                      {r.status === 'DRAFT' ? t('Check & pay') : t('Details')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : tab === 'settings' ? (
        <Card className="overflow-hidden">
          {staff.length === 0 ? (
            <Empty icon={<Settings2 className="h-6 w-6" />} title={t('No staff yet')} text={t('Add your barbers on the Staff page first.')} />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {staff.map((s) => {
                const cur = settings[s.staffId];
                return (
                  <li key={s.staffId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--foreground)]">{s.fullName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{describe(cur)}</p>
                      {cur && (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {t('Vacation pay {n}%', { n: cur.vacationPayRate ?? 4 })}
                          {cur.cppExempt ? ` · ${t('No CPP')}` : ''}
                          {cur.eiExempt ? ` · ${t('No EI')}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {cur ? <Pill tone="good">{t('Set up')}</Pill> : <Pill tone="warn">{t('Not set up')}</Pill>}
                      <button onClick={() => openSettings(s)} className={quietButton}>
                        <Settings2 className="h-3.5 w-3.5" /> {cur ? t('Edit') : t('Set up')}
                      </button>
                      <button onClick={() => openRun(s.staffId)} className={quietButton}>
                        {t('Run pay')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <Field label={t('Year')} className="w-36">
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputClass}>
                {[0, 1, 2].map((i) => {
                  const y = new Date().getFullYear() - i;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
              </select>
            </Field>
            <button onClick={loadYear} className={`${quietButton} h-[42px]`} aria-label={t('Refresh')}>
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {yearLoading ? (
            <Card>
              <Loading text={t('Loading…')} />
            </Card>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {staff.map((s) => {
                  const fields = numberFields(ytd[s.staffId]).filter(([k]) => !/^(year)$/i.test(k));
                  return (
                    <Card key={s.staffId} className="p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <CalendarRange className="h-4 w-4 text-[var(--primary)]" />
                        <p className="text-sm font-bold text-[var(--foreground)]">{s.fullName}</p>
                        <span className="text-xs text-[var(--muted-foreground)]">{t('Year to date')}</span>
                      </div>
                      {fields.length === 0 ? (
                        <p className="text-sm text-[var(--muted-foreground)]">{t('Nothing paid this year yet.')}</p>
                      ) : (
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                          {fields.map(([k, v]) => (
                            <React.Fragment key={k}>
                              <dt className="text-[var(--muted-foreground)]">{t(humanize(k))}</dt>
                              <dd className="text-end font-semibold tabular-nums text-[var(--foreground)]">{/hours|count|cheques/i.test(k) ? v : money(v)}</dd>
                            </React.Fragment>
                          ))}
                        </dl>
                      )}
                    </Card>
                  );
                })}
              </div>

              <Card className="overflow-hidden">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <h2 className="font-display text-lg font-bold tracking-wide text-[var(--foreground)]">{t('T4 summary {y}', { y: year })}</h2>
                  <p className="text-xs text-[var(--muted-foreground)]">{t('The amounts for each employee’s T4 slip and the T4 Summary you file with CRA.')}</p>
                </div>
                {!t4 || (t4Employees.length === 0 && !t4Totals) ? (
                  <p className="p-4 text-sm text-[var(--muted-foreground)]">{t('No paid cheques in this year yet.')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <T4Table rows={t4Employees} totals={t4Totals} staffName={(id, f) => staffName(id, f)} />
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {/* New pay run */}
      <Modal
        open={runOpen}
        wide
        title={t('Run pay')}
        onClose={() => setRunOpen(false)}
        footer={
          <>
            <button onClick={() => setRunOpen(false)} className={quietButton}>
              {t('Cancel')}
            </button>
            <button type="submit" form="run-form" disabled={savingRun || !run.staffId} className={primaryButton}>
              {savingRun ? t('Working it out…') : t('Work out pay')}
            </button>
          </>
        }
      >
        <form id="run-form" onSubmit={saveRun} className="grid gap-4 sm:grid-cols-2">
          <Field label={t('Barber')} className="sm:col-span-2">
            <select value={run.staffId} onChange={(e) => setRun({ ...run, staffId: e.target.value })} className={inputClass}>
              {staff.map((s) => (
                <option key={s.staffId} value={s.staffId}>
                  {s.fullName}
                </option>
              ))}
            </select>
            <span className="block text-[11px] text-[var(--muted-foreground)]">{describe(runSettings)}</span>
          </Field>
          <Field label={t('Period from')}>
            <input type="date" required value={run.periodStart} onChange={(e) => setRun({ ...run, periodStart: e.target.value })} className={inputClass} />
          </Field>
          <Field label={t('Period to')}>
            <input type="date" required value={run.periodEnd} min={run.periodStart} onChange={(e) => setRun({ ...run, periodEnd: e.target.value })} className={inputClass} />
          </Field>
          <Field label={t('Pay date')} hint={t('Sets which tax year the cheque counts in.')}>
            <input type="date" value={run.payDate} onChange={(e) => setRun({ ...run, payDate: e.target.value })} className={inputClass} />
          </Field>
          {runSettings ? (
            <>
              {needsHours && (
                <Field label={t('Hours worked')}>
                  <input type="number" step="0.25" min="0" required dir="ltr" value={run.hoursWorked} onChange={(e) => setRun({ ...run, hoursWorked: e.target.value })} className={inputClass} />
                </Field>
              )}
              {needsSales && (
                <Field label={t('Sales for commission')} hint={t('Service sales in the period, before HST.')}>
                  <input type="number" step="0.01" min="0" required dir="ltr" value={run.commissionSales} onChange={(e) => setRun({ ...run, commissionSales: e.target.value })} className={inputClass} />
                </Field>
              )}
            </>
          ) : (
            <>
              <Field label={t('Pay before deductions')} hint={t('This barber has no pay settings, so pay is entered by hand.')}>
                <input type="number" step="0.01" min="0" required dir="ltr" value={run.baseSalary} onChange={(e) => setRun({ ...run, baseSalary: e.target.value })} className={inputClass} />
              </Field>
              <Field label={t('Deductions')}>
                <input type="number" step="0.01" min="0" dir="ltr" value={run.deductions} onChange={(e) => setRun({ ...run, deductions: e.target.value })} className={inputClass} />
              </Field>
            </>
          )}
          <Field label={t('Bonus or tips')}>
            <input type="number" step="0.01" min="0" dir="ltr" value={run.bonus} onChange={(e) => setRun({ ...run, bonus: e.target.value })} className={inputClass} />
          </Field>
          <Field label={t('Notes')} className="sm:col-span-2">
            <input value={run.notes} onChange={(e) => setRun({ ...run, notes: e.target.value })} className={inputClass} />
          </Field>
          {runSettings && (
            <p className="text-xs text-[var(--muted-foreground)] sm:col-span-2">{t('CPP, EI, income tax and vacation pay are worked out by the server from the pay settings.')}</p>
          )}
        </form>
      </Modal>

      {/* Detail */}
      <Modal
        open={!!detail}
        wide
        title={detail ? `${staffName(detail.staffId, detail.staffName)} · ${detail.periodStart} → ${detail.periodEnd}` : ''}
        onClose={() => setDetail(null)}
        footer={
          detail && (
            <>
              {detail.status === 'DRAFT' && (
                <button onClick={remove} disabled={busy} className={`${dangerButton} me-auto`}>
                  <Trash2 className="h-3.5 w-3.5" /> {t('Delete')}
                </button>
              )}
              {detail.status === 'PAID' && (
                <>
                  <button onClick={reverse} disabled={busy} className={`${dangerButton} me-auto`}>
                    <Undo2 className="h-3.5 w-3.5" /> {t('Reverse')}
                  </button>
                  <button onClick={() => stub(detail)} className={primaryButton}>
                    <FileDown className="h-4 w-4" /> {t('Download pay stub')}
                  </button>
                </>
              )}
              {detail.status === 'DRAFT' && (
                <button onClick={pay} disabled={busy || !payAccount} className={primaryButton}>
                  <Wallet className="h-4 w-4" /> {busy ? t('Paying…') : t('Pay {a}', { a: money(detail.net) })}
                </button>
              )}
            </>
          )
        }
      >
        {detail && <Breakdown run={detail} money={money} t={t} />}
        {detail?.status === 'DRAFT' && (
          <Field label={t('Pay from')}>
            <select value={payAccount} onChange={(e) => setPayAccount(e.target.value)} className={inputClass}>
              {accounts.length === 0 && <option value="">{t('No bank or cash account found')}</option>}
              {accounts.map((a) => (
                <option key={a.accountId} value={a.accountId}>
                  {a.code ? `${a.code} · ` : ''}
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </Modal>

      {/* Pay settings */}
      <Modal
        open={!!editStaff}
        wide
        title={editStaff ? t('Pay settings for {name}', { name: editStaff.fullName }) : ''}
        onClose={() => setEditStaff(null)}
        footer={
          <>
            <button onClick={() => setEditStaff(null)} className={quietButton}>
              {t('Cancel')}
            </button>
            <button type="submit" form="settings-form" disabled={savingSettings} className={primaryButton}>
              {savingSettings ? t('Saving…') : t('Save')}
            </button>
          </>
        }
      >
        <form id="settings-form" onSubmit={saveSettings} className="grid gap-4 sm:grid-cols-2">
          <Field label={t('Paid by')}>
            <select value={form.payType} onChange={(e) => setForm({ ...form, payType: e.target.value as PayType })} className={inputClass}>
              {(Object.keys(PAY_TYPE_LABEL) as PayType[]).map((p) => (
                <option key={p} value={p}>
                  {t(PAY_TYPE_LABEL[p])}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('How often')}>
            <select value={form.payFrequency} onChange={(e) => setForm({ ...form, payFrequency: e.target.value as Frequency })} className={inputClass}>
              {(Object.keys(FREQ_LABEL) as Frequency[]).map((f) => (
                <option key={f} value={f}>
                  {t(FREQ_LABEL[f])}
                </option>
              ))}
            </select>
          </Field>
          {form.payType !== 'COMMISSION' && (
            <Field label={t('Hourly rate ($)')}>
              <input type="number" step="0.01" min="0" dir="ltr" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} className={inputClass} />
            </Field>
          )}
          {form.payType !== 'HOURLY' && (
            <Field label={t('Commission (%)')} hint={t('Share of the barber’s service sales.')}>
              <input type="number" step="0.5" min="0" max="100" dir="ltr" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} className={inputClass} />
            </Field>
          )}
          <Field label={t('Vacation pay (%)')} hint={t('At least 4% in New Brunswick (6% after 8 years).')}>
            <input type="number" step="0.5" min="0" dir="ltr" value={form.vacationPayRate} onChange={(e) => setForm({ ...form, vacationPayRate: e.target.value })} className={inputClass} />
          </Field>
          <Field label={t('Province')}>
            <input value={t('New Brunswick')} disabled className={inputClass} />
          </Field>
          <Field label={t('TD1 federal claim ($)')} hint={t('From the barber’s TD1 form. Leave empty for the basic personal amount.')}>
            <input type="number" step="0.01" min="0" dir="ltr" value={form.federalClaimAmount} onChange={(e) => setForm({ ...form, federalClaimAmount: e.target.value })} className={inputClass} />
          </Field>
          <Field label={t('TD1NB provincial claim ($)')} hint={t('From the TD1NB form. Leave empty for the basic personal amount.')}>
            <input type="number" step="0.01" min="0" dir="ltr" value={form.provincialClaimAmount} onChange={(e) => setForm({ ...form, provincialClaimAmount: e.target.value })} className={inputClass} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input type="checkbox" className="accent-[var(--primary)]" checked={form.cppExempt} onChange={(e) => setForm({ ...form, cppExempt: e.target.checked })} />
            {t('No CPP (e.g. under 18, over 70, or receiving CPP disability)')}
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input type="checkbox" className="accent-[var(--primary)]" checked={form.eiExempt} onChange={(e) => setForm({ ...form, eiExempt: e.target.checked })} />
            {t('No EI (e.g. owner or a close relative of the owner)')}
          </label>
        </form>
      </Modal>
    </div>
  );
}

function Breakdown({ run, money, t }: { run: PayRun; money: (v: unknown) => string; t: (s: string, v?: Record<string, string | number>) => string }) {
  const earnings = present(run.raw, EARNINGS);
  const deductions = present(run.raw, DEDUCTIONS);
  const employer = present(run.raw, EMPLOYER);
  const row = (label: string, value: string, strong = false) => (
    <div key={label} className={`flex justify-between gap-4 py-1.5 text-sm ${strong ? 'font-bold text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
      <span>{label}</span>
      <span className="tabular-nums text-[var(--foreground)]">{value}</span>
    </div>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-[var(--border)] p-4">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--primary)]">{t('Earnings')}</p>
        {earnings.map(([l, v]) => row(t(l), l === 'Hours worked' ? String(v) : money(v)))}
        {row(t('Gross pay'), money(run.gross || earnings.filter(([l]) => l !== 'Hours worked').reduce((s, [, v]) => s + Number(v), 0)), true)}
      </div>
      <div className="rounded-lg border border-[var(--border)] p-4">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--primary)]">{t('Deductions')}</p>
        {deductions.length > 0 ? deductions.map(([l, v]) => row(t(l), money(v))) : row(t('Total deductions'), money(run.deductions))}
        {deductions.length > 0 && row(t('Total deductions'), money(run.deductions || deductions.reduce((s, [, v]) => s + Number(v), 0)), true)}
      </div>
      <div className="flex items-center justify-between rounded-lg bg-[var(--primary-light)] p-4 sm:col-span-2">
        <span className="font-display text-base font-bold tracking-wide text-[var(--foreground)]">{t('Take-home pay')}</span>
        <span className="metal-gold font-display text-2xl font-bold tabular-nums">{money(run.net)}</span>
      </div>
      {employer.length > 0 && (
        <div className="rounded-lg border border-dashed border-[var(--border-strong)] p-4 sm:col-span-2">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{t('Shop also owes CRA')}</p>
          {employer.map(([l, v]) => row(t(l), money(v)))}
        </div>
      )}
    </div>
  );
}

function T4Table({ rows, totals, staffName }: { rows: any[]; totals: any; staffName: (id: string, fallback?: string) => string }) {
  const { t } = useT();
  const money = useMoney();
  const keys = Array.from(new Set(rows.flatMap((r) => numberFields(r).map(([k]) => k))));
  const totalFields = numberFields(totals);
  return (
    <table className="w-full min-w-[640px] text-sm">
      <thead>
        <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
          <th className="px-4 py-2.5 text-start font-bold">{t('Employee')}</th>
          {keys.map((k) => (
            <th key={k} className="px-4 py-2.5 text-end font-bold">
              {t(humanize(k))}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]">
        {rows.map((r, i) => (
          <tr key={String(pick(r, 'staffId') ?? i)}>
            <td className="px-4 py-2.5 font-bold text-[var(--foreground)]">{staffName(String(pick(r, 'staffId') ?? ''), pick(r, 'staffName', 'employeeName', 'name'))}</td>
            {keys.map((k) => (
              <td key={k} className="px-4 py-2.5 text-end tabular-nums">
                {money(num(r, k))}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {totalFields.length > 0 && (
        <tfoot>
          <tr className="border-t-2 border-[var(--border-strong)]">
            <td className="px-4 py-2.5 font-bold text-[var(--foreground)]">{t('Totals')}</td>
            {keys.map((k) => {
              const v = totalFields.find(([tk]) => tk === k);
              return (
                <td key={k} className="px-4 py-2.5 text-end font-bold tabular-nums text-[var(--foreground)]">
                  {v ? money(v[1]) : ''}
                </td>
              );
            })}
          </tr>
          {totalFields
            .filter(([k]) => !keys.includes(k))
            .map(([k, v]) => (
              <tr key={k}>
                <td className="px-4 py-1.5 text-[var(--muted-foreground)]" colSpan={keys.length}>
                  {t(humanize(k))}
                </td>
                <td className="px-4 py-1.5 text-end font-bold tabular-nums">{money(v)}</td>
              </tr>
            ))}
        </tfoot>
      )}
    </table>
  );
}
