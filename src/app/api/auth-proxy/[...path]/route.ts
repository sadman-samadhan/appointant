import { NextRequest, NextResponse } from 'next/server';

const AUTH_BACKEND = process.env.AUTH_BACKEND_URL || 'http://3.6.123.11:3302';

async function safeFetch(url: string, init?: RequestInit, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

// Pure pass-through to the Auth Service. Never fabricate tokens or profiles here:
// whatever the Auth Service answers (including 401 for bad credentials) is what the
// browser receives.
async function handleProxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
  method: string
) {
  const { path } = await params;
  const targetPath = '/' + path.join('/');
  const url = `${AUTH_BACKEND}${targetPath}${request.nextUrl.search}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authHeader = request.headers.get('Authorization');
  if (authHeader) headers['Authorization'] = authHeader;

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
          ? 'The sign-in service did not respond in time. Please try again.'
          : 'The sign-in service is unreachable. Please try again shortly.',
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
