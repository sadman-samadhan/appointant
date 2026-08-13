import { NextRequest, NextResponse } from 'next/server';

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

  const tenantHeader = request.headers.get('x-tenant-id');
  if (tenantHeader) headers['x-tenant-id'] = tenantHeader;

  const branchHeader = request.headers.get('x-branch-id');
  if (branchHeader) headers['x-branch-id'] = branchHeader;

  let body: string | undefined = undefined;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      body = await request.text();
    } catch {
      /* body might be empty */
    }
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
