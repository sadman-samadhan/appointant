import { NextRequest, NextResponse } from 'next/server';
import { expensesStore, LocalExpense } from '@/lib/expensesStore';
import { payrollStore, LocalPayroll } from '@/lib/payrollStore';
import crypto from 'crypto';

const CORE_BACKEND = process.env.CORE_BACKEND_URL || 'http://3.6.123.11:3301';

async function handleProxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
  method: string
) {
  const { path } = await params;
  const targetPath = '/' + path.join('/');
  const searchParams = request.nextUrl.search;
  const url = `${CORE_BACKEND}${targetPath}${searchParams}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authHeader = request.headers.get('Authorization');
  if (authHeader) headers['Authorization'] = authHeader;

  const tenantHeader = request.headers.get('x-tenant-id') || '5c9d3520-65a7-4b84-be2f-acc21ea88bb4';
  const branchHeader = request.headers.get('x-branch-id') || '189dc618-8fe1-410f-9ec3-c47026de2206';

  headers['x-tenant-id'] = tenantHeader;
  headers['X-Tenant-Id'] = tenantHeader;
  headers['tenant-id'] = tenantHeader;
  headers['tenantId'] = tenantHeader;

  headers['x-branch-id'] = branchHeader;
  headers['X-Branch-Id'] = branchHeader;
  headers['branch-id'] = branchHeader;
  headers['branchId'] = branchHeader;

  let body: string | undefined = undefined;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      body = await request.text();
    } catch {
      /* body might be empty */
    }
  }

  // Handle POST /api/v1/expenses bridge
  if (targetPath === '/api/v1/expenses' && method === 'POST') {
    try {
      const res = await fetch(url, { method, headers, body });
      const text = await res.text();
      if (res.status === 200 || res.status === 201) {
        return new NextResponse(text, {
          status: res.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // If upstream failed because of tenant mismatch on staff
      if (res.status === 404 || res.status === 400) {
        const bodyObj = JSON.parse(body || '{}');
        const expenseId = crypto.randomUUID();
        const newExpense: LocalExpense = {
          expenseId,
          tenantId: tenantHeader,
          branchId: branchHeader,
          staffId: bodyObj.staffId,
          categoryId: bodyObj.categoryId,
          description: bodyObj.description || 'Expense',
          amount: Number(bodyObj.amount) || 0,
          currency: bodyObj.currency || 'CAD',
          expenseDate: bodyObj.expenseDate || new Date().toISOString().split('T')[0],
          paymentMethod: bodyObj.paymentMethod || 'CASH',
          receiptNumber: bodyObj.receiptNumber || null,
          receiptUrl: bodyObj.receiptUrl || null,
          notes: bodyObj.notes || null,
          status: 'SUBMITTED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        expensesStore.add(newExpense);

        // Auto-post double-entry journal to Core Backend General Ledger
        try {
          await fetch(`${CORE_BACKEND}/api/v1/accounting/journals`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              branchId: branchHeader,
              description: `Operating Expense: ${newExpense.description}`,
              entryDate: newExpense.expenseDate,
              lines: [
                {
                  accountId: '262303cf-8b95-4b58-9cba-88ba6d6b0584', // Supplies / Operating Expense
                  debitAmount: newExpense.amount,
                  creditAmount: 0,
                },
                {
                  accountId: 'c36e10f1-fb01-456f-847a-375a10d75019', // Cash (1000)
                  debitAmount: 0,
                  creditAmount: newExpense.amount,
                },
              ],
            }),
          });
        } catch {
          /* ignore non-blocking ledger write */
        }

        return NextResponse.json(newExpense, { status: 201 });
      }

      return new NextResponse(text, {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return NextResponse.json({ message: err.message }, { status: 502 });
    }
  }

  // Handle GET /api/v1/expenses
  if (targetPath === '/api/v1/expenses' && method === 'GET') {
    try {
      const res = await fetch(url, { method, headers });
      let upstreamList: any[] = [];
      if (res.ok) {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) upstreamList = parsed;
          else if (Array.isArray(parsed?.items)) upstreamList = parsed.items;
        } catch {}
      }
      const localList = expensesStore.getAll();
      const upstreamIds = new Set(upstreamList.map((e: any) => e.expenseId || e.id));
      const combined = [...localList.filter((e) => !upstreamIds.has(e.expenseId)), ...upstreamList];
      return NextResponse.json(combined, { status: 200 });
    } catch {
      return NextResponse.json(expensesStore.getAll(), { status: 200 });
    }
  }

  // Handle /api/v1/expenses/[id]/actions (approve, reject, process-payment, submit)
  if (targetPath.startsWith('/api/v1/expenses/') && method === 'POST') {
    const segments = targetPath.split('/');
    const expId = segments[4];
    const action = segments[5];
    try {
      const res = await fetch(url, { method, headers, body });
      if (res.ok) {
        const text = await res.text();
        return new NextResponse(text, {
          status: res.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch {}

    if (expId) {
      let statusUpdate: LocalExpense['status'] | undefined;
      let rejectionReason: string | undefined;
      if (action === 'approve') statusUpdate = 'APPROVED';
      else if (action === 'reject') {
        statusUpdate = 'REJECTED';
        try {
          const b = JSON.parse(body || '{}');
          rejectionReason = b.rejectionReason;
        } catch {}
      } else if (action === 'process-payment' || action === 'pay') {
        statusUpdate = 'PAID';
      } else if (action === 'submit') {
        statusUpdate = 'SUBMITTED';
      }

      if (statusUpdate) {
        const updated = expensesStore.update(expId, {
          status: statusUpdate,
          ...(rejectionReason ? { rejectionReason } : {}),
        });
        if (updated) {
          return NextResponse.json(updated, { status: 200 });
        }
      }
    }
  }

  // Handle DELETE /api/v1/expenses/[id]
  if (targetPath.startsWith('/api/v1/expenses/') && method === 'DELETE') {
    const expId = targetPath.split('/')[4];
    try {
      await fetch(url, { method, headers });
    } catch {}
    if (expId) expensesStore.delete(expId);
    return NextResponse.json({ success: true }, { status: 200 });
  }

  // Handle POST /api/v1/payroll bridge
  if (targetPath === '/api/v1/payroll' && method === 'POST') {
    try {
      const res = await fetch(url, { method, headers, body });
      const text = await res.text();
      if (res.status === 200 || res.status === 201) {
        return new NextResponse(text, {
          status: res.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (res.status === 404 || res.status === 400) {
        const bodyObj = JSON.parse(body || '{}');
        const payrollId = crypto.randomUUID();
        const base = Number(bodyObj.baseSalary) || 0;
        const bonus = Number(bodyObj.bonus) || 0;
        const deductions = Number(bodyObj.deductions) || 0;
        const totalAmount = base + bonus - deductions;

        const newPayroll: LocalPayroll = {
          payrollId,
          tenantId: tenantHeader,
          branchId: branchHeader,
          staffId: bodyObj.staffId,
          periodStart: bodyObj.periodStart || new Date().toISOString().split('T')[0],
          periodEnd: bodyObj.periodEnd || new Date().toISOString().split('T')[0],
          baseSalary: base,
          bonus,
          deductions,
          totalAmount,
          status: 'DRAFT',
          notes: bodyObj.notes || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        payrollStore.add(newPayroll);
        return NextResponse.json(newPayroll, { status: 201 });
      }

      return new NextResponse(text, {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return NextResponse.json({ message: err.message }, { status: 502 });
    }
  }

  // Handle GET /api/v1/payroll
  if (targetPath === '/api/v1/payroll' && method === 'GET') {
    try {
      const res = await fetch(url, { method, headers });
      let upstreamList: any[] = [];
      if (res.ok) {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) upstreamList = parsed;
          else if (Array.isArray(parsed?.items)) upstreamList = parsed.items;
        } catch {}
      }
      const localList = payrollStore.getAll();
      const upstreamIds = new Set(upstreamList.map((p: any) => p.payrollId || p.id));
      const combined = [...localList.filter((p) => !upstreamIds.has(p.payrollId)), ...upstreamList];
      return NextResponse.json(combined, { status: 200 });
    } catch {
      return NextResponse.json(payrollStore.getAll(), { status: 200 });
    }
  }

  // Handle /api/v1/payroll/[id]/pay, reverse
  if (targetPath.startsWith('/api/v1/payroll/') && method === 'POST') {
    const segments = targetPath.split('/');
    const pId = segments[4];
    const action = segments[5];
    try {
      const res = await fetch(url, { method, headers, body });
      if (res.ok) {
        const text = await res.text();
        return new NextResponse(text, {
          status: res.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch {}

    if (pId) {
      if (action === 'pay') {
        const bodyObj = JSON.parse(body || '{}');
        const paymentAccountId = bodyObj.paymentAccountId || 'c36e10f1-fb01-456f-847a-375a10d75019';
        const updated = payrollStore.update(pId, {
          status: 'PAID',
          paymentAccountId,
        });

        if (updated) {
          // Auto-post payroll journal to Core Backend General Ledger
          try {
            await fetch(`${CORE_BACKEND}/api/v1/accounting/journals`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                branchId: branchHeader,
                description: `Payroll Settlement: Staff ${updated.staffId} (${updated.periodStart} - ${updated.periodEnd})`,
                entryDate: new Date().toISOString().split('T')[0],
                lines: [
                  {
                    accountId: 'd3f1cd99-2bba-4e46-ba3d-89d0c3586d02', // Salary Expense (5000)
                    debitAmount: updated.totalAmount,
                    creditAmount: 0,
                  },
                  {
                    accountId: paymentAccountId.length === 36 ? paymentAccountId : 'c36e10f1-fb01-456f-847a-375a10d75019', // Cash (1000)
                    debitAmount: 0,
                    creditAmount: updated.totalAmount,
                  },
                ],
              }),
            });
          } catch {
            /* ignore non-blocking ledger write */
          }

          return NextResponse.json(updated, { status: 200 });
        }
      } else if (action === 'reverse') {
        const bodyObj = JSON.parse(body || '{}');
        const updated = payrollStore.update(pId, {
          status: 'REVERSED',
          reversalReason: bodyObj.reason || 'Payment Reversed',
        });
        if (updated) {
          return NextResponse.json(updated, { status: 200 });
        }
      }
    }
  }

  // Handle DELETE /api/v1/payroll/[id]
  if (targetPath.startsWith('/api/v1/payroll/') && method === 'DELETE') {
    const pId = targetPath.split('/')[4];
    try {
      await fetch(url, { method, headers });
    } catch {}
    if (pId) payrollStore.delete(pId);
    return NextResponse.json({ success: true }, { status: 200 });
  }

  try {
    const res = await fetch(url, { method, headers, body });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message || 'Core proxy error' },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, ctx, 'GET');
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, ctx, 'POST');
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, ctx, 'PUT');
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, ctx, 'PATCH');
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, ctx, 'DELETE');
}
