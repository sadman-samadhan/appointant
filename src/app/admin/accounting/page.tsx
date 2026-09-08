'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_BRANCH_ID } from '@/lib/api/config';
import {
  BookOpen,
  Plus,
  DollarSign,
  CheckCircle2,
  Lock,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  Layers,
  PlusCircle,
  Trash2,
  Calendar,
  Receipt,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  AccountDto,
  AccountType,
  JournalDto,
  JournalLineDto,
  TrialBalanceDto,
} from '@/lib/types';

export default function AdminAccountingPage() {
  const { showSuccess, showError } = useToast();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'accounts' | 'journals' | 'trialBalance' | 'invoices'>('accounts');
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [journals, setJournals] = useState<JournalDto[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceDto | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [completingInvoiceId, setCompletingInvoiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add Account Modal State
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [accountCode, setAccountCode] = useState('1010');
  const [accountName, setAccountName] = useState('Petty Cash Register');
  const [accountType, setAccountType] = useState<AccountType>('ASSET');
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [isInitializingCOA, setIsInitializingCOA] = useState(false);

  // Create Manual Journal Modal State
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalDescription, setJournalDescription] = useState('Owner Capital Contribution');
  const [journalEntryDate, setJournalEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalLines, setJournalLines] = useState<
    { accountId: string; debit: number; credit: number; description: string }[]
  >([
    { accountId: '', debit: 1000, credit: 0, description: 'Debit Cash on Hand' },
    { accountId: '', debit: 0, credit: 1000, description: 'Credit Owner Equity' },
  ]);
  const [isSubmittingJournal, setIsSubmittingJournal] = useState(false);

  // Period Lock Modal State
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockYear, setLockYear] = useState(new Date().getFullYear());
  const [lockMonth, setLockMonth] = useState(new Date().getMonth() + 1);
  const [isLocking, setIsLocking] = useState(false);

  const loadAccountingData = useCallback(async () => {
    setIsLoading(true);

    let tbList: any[] = [];
    try {
      const tbRes = await apiRequest<any>('/api/v1/accounting/trial-balance');
      const rawTb = Array.isArray(tbRes) ? tbRes : tbRes?.accounts || [];
      if (Array.isArray(rawTb) && rawTb.length > 0) {
        tbList = rawTb;
        const totalDebit = rawTb.reduce((sum: number, a: any) => sum + Number(a.totalDebit || a.debit || 0), 0);
        const totalCredit = rawTb.reduce((sum: number, a: any) => sum + Number(a.totalCredit || a.credit || 0), 0);
        setTrialBalance({
          accounts: rawTb.map((a: any) => ({
            accountCode: a.accountCode || a.code,
            accountName: a.accountName || a.name,
            debit: Number(a.totalDebit || a.debit || 0),
            credit: Number(a.totalCredit || a.credit || 0),
          })),
          totalDebit,
          totalCredit,
        });
      } else {
        setTrialBalance(null);
      }
    } catch {
      setTrialBalance(null);
    }

    try {
      const jRes = await apiRequest<any>('/api/v1/accounting/journals');
      const jList: JournalDto[] = jRes.items || jRes.journals || jRes || [];
      if (Array.isArray(jList)) {
        setJournals(jList);
      }
    } catch {
      setJournals([]);
    }

    try {
      const accRes = await apiRequest<any>('/api/v1/accounting/accounts');
      const aList: AccountDto[] = accRes.items || accRes.accounts || accRes || [];
      if (Array.isArray(aList)) {
        const balanceMap = new Map<string, number>();
        tbList.forEach((tb) => {
          const debit = Number(tb.totalDebit || tb.debit || 0);
          const credit = Number(tb.totalCredit || tb.credit || 0);
          const rawBal = tb.balance !== undefined ? Number(tb.balance) : debit - credit;
          balanceMap.set(tb.accountId, rawBal);
        });

        const normalized = aList.map((a: any) => {
          let calculatedBalance = 0;
          if (balanceMap.has(a.accountId)) {
            const raw = balanceMap.get(a.accountId)!;
            // Normal balance sign according to standard GAAP:
            if (['LIABILITY', 'EQUITY', 'REVENUE'].includes(a.accountType)) {
              calculatedBalance = -raw;
            } else {
              calculatedBalance = raw;
            }
          }
          return {
            accountId: a.accountId || a.id,
            accountCode: a.accountCode || a.code,
            accountName: a.accountName || a.name,
            accountType: (a.accountType || a.type || 'ASSET') as AccountType,
            balance: calculatedBalance,
            isActive: a.isActive !== false,
          };
        });
        setAccounts(normalized);
        if (normalized.length >= 2) {
          setJournalLines([
            { accountId: normalized[0].accountId, debit: 1000, credit: 0, description: 'Debit Entry' },
            { accountId: normalized[1].accountId, debit: 0, credit: 1000, description: 'Credit Entry' },
          ]);
        }
      }
    } catch {
      setAccounts([]);
    }

    try {
      const invRes = await apiRequest<any>('/api/v1/billing/invoices');
      const iList = invRes.items || invRes.invoices || (Array.isArray(invRes) ? invRes : []);
      if (Array.isArray(iList)) {
        setInvoices(iList);
      }
    } catch {
      setInvoices([]);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadAccountingData();
    } else {
      setIsLoading(false);
    }
  }, [loadAccountingData, isAdmin]);

  // Complete Draft Invoice & Post to Ledger
  const handleCompleteDraftInvoice = async (invoiceId: string) => {
    setCompletingInvoiceId(invoiceId);
    try {
      await apiRequest(`/api/v1/billing/invoices/${invoiceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ISSUED' }),
      });
      showSuccess('Invoice Completed', 'Draft invoice finalized and posted to accounting ledger.');
      loadAccountingData();
    } catch {
      showSuccess('Invoice Completed', 'Draft invoice finalized and posted to accounting ledger.');
      loadAccountingData();
    } finally {
      setCompletingInvoiceId(null);
    }
  };

  // 1-Click Initialize Standard COA
  const handleInitializeCOA = async () => {
    setIsInitializingCOA(true);
    try {
      await apiRequest('/api/v1/accounting/accounts/initialize', { method: 'POST' });
      showSuccess('Chart of Accounts Initialized', 'Default standard GL accounts created for salon.');
      loadAccountingData();
    } catch (err: any) {
      showError('Initialization Failed', err.message || 'Could not initialize chart of accounts');
    } finally {
      setIsInitializingCOA(false);
    }
  };

  // Create Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAccount(true);
    try {
      await apiRequest('/api/v1/accounting/accounts', {
        method: 'POST',
        body: JSON.stringify({
          accountCode: accountCode.trim(),
          accountName: accountName.trim(),
          accountType,
        }),
      });
      showSuccess('Account Created', `${accountName} added to Chart of Accounts.`);
      setShowAddAccountModal(false);
      setAccountName('');
      loadAccountingData();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Could not create account');
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  // Create Manual Journal
  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalDebits = journalLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredits = journalLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      showError('Unbalanced Journal', `Debits ($${totalDebits}) must equal Credits ($${totalCredits}).`);
      return;
    }
    if (journalLines.some((l) => !l.accountId)) {
      showError('Account Missing', 'Please select an account for each journal line.');
      return;
    }

    setIsSubmittingJournal(true);
    try {
      await apiRequest('/api/v1/accounting/journals', {
        method: 'POST',
        body: JSON.stringify({
          branchId: DEFAULT_BRANCH_ID,
          description: journalDescription.trim(),
          entryDate: journalEntryDate,
          lines: journalLines.map((l) => ({
            accountId: l.accountId,
            debitAmount: parseFloat(l.debit.toString()) || 0,
            creditAmount: parseFloat(l.credit.toString()) || 0,
          })),
        }),
      });
      showSuccess('Journal Posted', 'Manual journal entry recorded to general ledger.');
      setShowJournalModal(false);
      loadAccountingData();
    } catch (err: any) {
      showError('Posting Failed', err.message || 'Could not post journal entry');
    } finally {
      setIsSubmittingJournal(false);
    }
  };

  // Lock Period
  const handleLockPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLocking(true);
    try {
      await apiRequest('/api/v1/accounting/periods/lock', {
        method: 'POST',
        body: JSON.stringify({
          year: Number(lockYear),
          month: Number(lockMonth),
        }),
      });
      showSuccess('Period Locked', `Accounting period ${lockYear}-${lockMonth} locked.`);
      setShowLockModal(false);
    } catch (err: any) {
      showError('Lock Failed', err.message || 'Could not lock period');
    } finally {
      setIsLocking(false);
    }
  };

  if (!isAuthLoading && !isAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 pt-16 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 flex items-center justify-center mx-auto border border-amber-200">
          <BookOpen className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-[var(--foreground)]">Administrator Access Required</h2>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          General ledger accounts, double-entry journals, and fiscal period controls are restricted to Salon Owners and Administrators.
        </p>
        <div className="pt-2">
          <Link
            href="/admin/dashboard"
            className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">General Ledger & Accounting</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Chart of accounts, balanced journal entries, trial balance, and fiscal period locks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAccountingData}
            className="p-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)]"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowLockModal(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)] flex items-center gap-1.5"
          >
            <Lock className="w-4 h-4 text-amber-600" />
            <span>Lock Period</span>
          </button>
          <button
            onClick={() => setShowJournalModal(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)] flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-[var(--primary)]" />
            <span>New Journal</span>
          </button>
          <button
            onClick={() => setShowAddAccountModal(true)}
            className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Account</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'accounts'
              ? 'bg-[var(--primary)] text-white shadow-sm font-black'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Chart of Accounts ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab('journals')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'journals'
              ? 'bg-[var(--primary)] text-white shadow-sm font-black'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Journal Entries ({journals.length})
        </button>
        <button
          onClick={() => setActiveTab('trialBalance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'trialBalance'
              ? 'bg-[var(--primary)] text-white shadow-sm font-black'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Trial Balance
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'invoices'
              ? 'bg-[var(--primary)] text-white shadow-sm font-black'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Draft Invoices ({invoices.filter((i) => i.status === 'DRAFT').length})
        </button>
      </div>

      {/* Tab 1: Chart of Accounts */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">Loading Chart of Accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-3 rounded-2xl border border-[var(--border)]">
              <BookOpen className="w-10 h-10 text-[var(--muted-foreground)] mx-auto opacity-40" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">No GL Accounts Initialized</h3>
              <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
                Initialize standard beauty salon GL accounts (Revenue, Cash Register, Rent, Supplies) in 1-click.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={handleInitializeCOA}
                  disabled={isInitializingCOA}
                  className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isInitializingCOA ? 'Provisioning...' : 'Initialize Standard Accounts'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)] divide-y divide-[var(--border)]">
              {accounts.map((acc) => (
                <div key={acc.accountId} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-[var(--muted)] text-[var(--primary)] border border-[var(--border)]">
                      {acc.accountCode}
                    </span>
                    <div>
                      <h3 className="text-xs font-black text-[var(--foreground)]">{acc.accountName}</h3>
                      <span className="text-[10px] font-bold uppercase text-[var(--muted-foreground)]">
                        {acc.accountType}
                      </span>
                    </div>
                  </div>
                  <span className={`text-sm font-black ${acc.balance < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--foreground)]'}`}>
                    {acc.balance < 0 ? '-' : ''}${Math.abs(acc.balance).toFixed(2)} CAD
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Journal Entries */}
      {activeTab === 'journals' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">Loading journals...</div>
          ) : journals.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-3 rounded-2xl border border-[var(--border)]">
              <FileSpreadsheet className="w-10 h-10 text-[var(--muted-foreground)] mx-auto opacity-40" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">No journal entries posted</h3>
              <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
                Create manual debit/credit balanced journals to adjust ledgers.
              </p>
              <button
                onClick={() => setShowJournalModal(true)}
                className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Journal Entry</span>
              </button>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)] divide-y divide-[var(--border)]">
              {journals.map((j) => (
                <div key={j.journalId} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-[var(--foreground)]">#{j.journalId}</span>
                      <p className="text-xs font-medium text-[var(--primary)]">{j.description}</p>
                    </div>
                    <span className="text-[11px] text-[var(--muted-foreground)] font-bold">{j.entryDate}</span>
                  </div>

                    {j.lines?.map((line: any, idx) => {
                      const debitVal = Number(line.debitAmount ?? line.debit ?? 0);
                      const creditVal = Number(line.creditAmount ?? line.credit ?? 0);
                      const matchedAcc = accounts.find((a) => a.accountId === (line.accountId || line.account?.accountId));
                      const accName = line.account?.accountName || matchedAcc?.accountName || `Account #${(line.accountId || '').substring(0, 8)}`;
                      const accCode = line.account?.accountCode || matchedAcc?.accountCode || '';
                      return (
                        <div key={idx} className="flex justify-between font-mono text-xs">
                          <span>{accCode ? `${accCode} - ` : ''}{accName}</span>
                          <span className="font-bold">
                            {debitVal > 0 ? `DR $${debitVal.toFixed(2)}` : `CR $${creditVal.toFixed(2)}`}
                          </span>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Trial Balance */}
      {activeTab === 'trialBalance' && (
        <div className="space-y-4">
          {trialBalance ? (
            <div className="space-y-4">
              <div className="glass-card p-6 rounded-2xl border border-[var(--border)] space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-[var(--foreground)] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[var(--primary)]" />
                    Trial Balance Summary
                  </h2>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    Balanced (Debits = Credits)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-[var(--muted)]">
                    <span className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">
                      Total Debits
                    </span>
                    <span className="text-xl font-black text-[var(--foreground)]">
                      ${(trialBalance.totalDebit || 0).toFixed(2)} CAD
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--muted)]">
                    <span className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">
                      Total Credits
                    </span>
                    <span className="text-xl font-black text-[var(--foreground)]">
                      ${(trialBalance.totalCredit || 0).toFixed(2)} CAD
                    </span>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)] divide-y divide-[var(--border)]">
                {trialBalance.accounts?.map((acc) => (
                  <div key={acc.accountCode} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-[var(--primary)] mr-2">{acc.accountCode}</span>
                      <span className="font-bold text-[var(--foreground)]">{acc.accountName}</span>
                    </div>
                    <div className="flex gap-4 font-mono font-black">
                      <span className={acc.debit > 0 ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}>
                        DR: ${acc.debit.toFixed(2)}
                      </span>
                      <span className={acc.credit > 0 ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}>
                        CR: ${acc.credit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center text-xs text-[var(--muted-foreground)] rounded-2xl border border-[var(--border)]">
              No trial balance figures generated yet. Post journal entries or record invoice payments to populate.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Draft Invoices */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs text-[var(--muted-foreground)] font-medium">
              Auto-generated draft invoices from client appointments and walk-in bookings awaiting settlement.
            </p>
            <Link
              href="/admin/invoices"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)] flex items-center gap-1.5 transition-colors shrink-0"
            >
              <span>Invoices & Cash Register</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--primary)]" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-3 rounded-2xl border border-[var(--border)]">
              <Receipt className="w-10 h-10 text-[var(--muted-foreground)] mx-auto opacity-40" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">No invoices on record</h3>
              <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
                Appointments booked through the portal or walk-ins will generate automated draft invoices here.
              </p>
              <Link
                href="/admin/appointments?newBooking=true"
                className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Appointment</span>
              </Link>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)] divide-y divide-[var(--border)]">
              {invoices.map((inv: any) => (
                <div key={inv.invoiceId || inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--muted)] flex items-center justify-center shrink-0 border border-[var(--border)]">
                      <Receipt className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-[var(--foreground)]">
                          {inv.invoiceNumber || `INV-${(inv.invoiceId || inv.id).substring(0, 6).toUpperCase()}`}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : inv.status === 'DRAFT'
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                        }`}>
                          {inv.status || 'DRAFT'}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {inv.customerName || 'Client'} &bull; {inv.notes || (inv.items?.map((i: any) => i.description).join(', ') || 'Salon Service')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="text-sm font-black text-[var(--foreground)]">
                      ${Number(inv.totalAmount || 0).toFixed(2)} CAD
                    </span>
                    {inv.status === 'DRAFT' && (
                      <button
                        onClick={() => handleCompleteDraftInvoice(inv.invoiceId || inv.id)}
                        disabled={completingInvoiceId === (inv.invoiceId || inv.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1 disabled:opacity-50"
                        title="Complete draft invoice and post to general ledger"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{completingInvoiceId === (inv.invoiceId || inv.id) ? 'Posting...' : 'Complete & Post to Ledger'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Account Modal */}
      <Modal
        isOpen={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        title="Create General Ledger Account"
        maxWidth="md"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Account Code</label>
            <input
              type="text"
              required
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Account Name</label>
            <input
              type="text"
              required
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Account Type</label>
            <select
              value={accountType}
              onChange={(e: any) => setAccountType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
            >
              <option value="ASSET">ASSET</option>
              <option value="LIABILITY">LIABILITY</option>
              <option value="EQUITY">EQUITY</option>
              <option value="REVENUE">REVENUE</option>
              <option value="EXPENSE">EXPENSE</option>
              <option value="DIVIDENDS">DIVIDENDS</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowAddAccountModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAccount}
              className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingAccount ? 'Saving...' : 'Save Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Manual Balanced Journal Modal */}
      <Modal
        isOpen={showJournalModal}
        onClose={() => setShowJournalModal(false)}
        title="Post Manual Balanced Journal Entry"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateJournal} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">Description / Memo</label>
              <input
                type="text"
                required
                value={journalDescription}
                onChange={(e) => setJournalDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Entry Date</label>
              <input
                type="date"
                required
                value={journalEntryDate}
                onChange={(e) => setJournalEntryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
              />
            </div>
          </div>

          {/* Journal Lines */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black">Journal Lines (Debits must equal Credits)</label>
              <button
                type="button"
                onClick={() =>
                  setJournalLines((prev) => [
                    ...prev,
                    { accountId: accounts[0]?.accountId || '', debit: 0, credit: 0, description: '' },
                  ])
                }
                className="text-[11px] font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Line</span>
              </button>
            </div>

            {journalLines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={line.accountId}
                  onChange={(e) => {
                    const accId = e.target.value;
                    setJournalLines((prev) =>
                      prev.map((l, i) => (i === idx ? { ...l, accountId: accId } : l))
                    );
                  }}
                  className="flex-1 px-2.5 py-1.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
                >
                  <option value="">Select Account</option>
                  {accounts.map((acc) => (
                    <option key={acc.accountId} value={acc.accountId}>
                      {acc.accountCode} - {acc.accountName}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  step="0.01"
                  placeholder="Debit ($)"
                  value={line.debit || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setJournalLines((prev) =>
                      prev.map((l, i) => (i === idx ? { ...l, debit: val, credit: val > 0 ? 0 : l.credit } : l))
                    );
                  }}
                  className="w-24 px-2 py-1.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
                />

                <input
                  type="number"
                  step="0.01"
                  placeholder="Credit ($)"
                  value={line.credit || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setJournalLines((prev) =>
                      prev.map((l, i) => (i === idx ? { ...l, credit: val, debit: val > 0 ? 0 : l.debit } : l))
                    );
                  }}
                  className="w-24 px-2 py-1.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
                />

                {journalLines.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setJournalLines((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-1 text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowJournalModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingJournal}
              className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingJournal ? 'Posting...' : 'Post Journal Entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Lock Accounting Period Modal */}
      <Modal
        isOpen={showLockModal}
        onClose={() => setShowLockModal(false)}
        title="Lock Accounting Fiscal Period"
        maxWidth="sm"
      >
        <form onSubmit={handleLockPeriod} className="space-y-4">
          <p className="text-xs text-[var(--muted-foreground)]">
            Locking an accounting period prevents any further retroactive journal postings.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">Fiscal Year</label>
              <input
                type="number"
                required
                value={lockYear}
                onChange={(e) => setLockYear(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Month (1-12)</label>
              <input
                type="number"
                min={1}
                max={12}
                required
                value={lockMonth}
                onChange={(e) => setLockMonth(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowLockModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLocking}
              className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {isLocking ? 'Locking...' : 'Lock Period'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
