import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID } from '@/lib/api/config';

const CORE_BACKEND = process.env.CORE_BACKEND_URL || 'http://3.6.123.11:3301';

async function safeFetch(url: string, init?: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

// Pure pass-through to the Core Backend. The backend is the single source of truth:
// this proxy never invents records or turns upstream errors into fake successes.
async function handleProxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
  method: string
) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
  }

  const { path } = await params;
  const targetPath = '/' + path.join('/');
  const url = `${CORE_BACKEND}${targetPath}${request.nextUrl.search}`;

  const tenantId = request.headers.get('x-tenant-id') || DEFAULT_TENANT_ID;
  const branchId = request.headers.get('x-branch-id') || DEFAULT_BRANCH_ID;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: authHeader,
    'x-tenant-id': tenantId,
    'x-branch-id': branchId,
  };

  const idempotencyKey = request.headers.get('Idempotency-Key');
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  let body: string | undefined = undefined;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      body = await request.text();
    } catch {
      /* body might be empty */
    }
  }

  try {
    const res = await safeFetch(url, { method, headers, body });
    // "No content" answers (e.g. a DELETE's 204) can't carry a body, not even an empty one.
    if ([204, 205, 304].includes(res.status)) return new NextResponse(null, { status: res.status });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err: any) {
    const timedOut = err?.name === 'AbortError';
    return NextResponse.json(
      {
        message: timedOut
          ? 'The salon server did not respond in time. Please try again.'
          : 'The salon server is unreachable. Please try again shortly.',
      },
      { status: timedOut ? 504 : 502 }
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
