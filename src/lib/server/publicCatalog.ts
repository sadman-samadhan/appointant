import 'server-only';
import { DEFAULT_BRANCH_ID } from '@/lib/api/config';
import { servicePrice, serviceDuration, toList } from '@/lib/format';

// The Core Backend has no anonymous endpoints, so the public service menu is read
// server-side with a dedicated catalog account. Its credentials live only in server
// env vars (CATALOG_USERID / CATALOG_PASSWORD) and never reach the browser; only a
// whitelisted subset of fields is returned.
const AUTH_BACKEND = process.env.AUTH_BACKEND_URL || 'http://3.6.123.11:3302';
const CORE_BACKEND = process.env.CORE_BACKEND_URL || 'http://3.6.123.11:3301';

export interface PublicService {
  serviceId: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  category: string;
  categoryOrder: number;
  currency: string;
}

export type CatalogResult =
  | { status: 'ok'; services: PublicService[] }
  | { status: 'not-configured' }
  | { status: 'unavailable' };

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getCatalogToken(forceNew = false): Promise<string | null> {
  const userid = process.env.CATALOG_USERID;
  const password = process.env.CATALOG_PASSWORD;
  if (!userid || !password) return null;
  if (!forceNew && cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const res = await fetch(`${AUTH_BACKEND}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userid, password }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Catalog sign-in failed (${res.status})`);
  const data = await res.json();
  // Renew a minute before the access token actually expires.
  const ttlMs = Math.max(60, Number(data.expires_in) || 900) * 1000 - 60_000;
  cachedToken = { value: data.access_token, expiresAt: Date.now() + ttlMs };
  return cachedToken.value;
}

async function fetchServices(token: string) {
  return fetch(`${CORE_BACKEND}/api/v1/services/branches/${DEFAULT_BRANCH_ID}`, {
    // No x-tenant-id: this endpoint is scoped by branch, and the header would make the
    // backend refuse a catalog account that isn't a member of the shop.
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(10000),
  });
}

export async function getPublicServices(): Promise<CatalogResult> {
  try {
    let token = await getCatalogToken();
    if (!token) return { status: 'not-configured' };

    let res = await fetchServices(token);
    if (res.status === 401) {
      token = await getCatalogToken(true);
      if (!token) return { status: 'not-configured' };
      res = await fetchServices(token);
    }
    if (!res.ok) return { status: 'unavailable' };

    const services = toList(await res.json(), 'services')
      // Only what the owner has published and allows customers to book online.
      .filter((s: any) => s && s.status === 'ACTIVE' && s.isOnlineBookable !== false && s.priceVisible !== false)
      .map(
        (s: any): PublicService => ({
          serviceId: String(s.serviceId || s.id),
          name: String(s.name || '').trim(),
          description: String(s.description || '').trim(),
          price: servicePrice(s),
          durationMinutes: serviceDuration(s),
          category: s.category?.name || s.categoryName || 'Services',
          categoryOrder: Number(s.category?.displayOrder ?? 999),
          currency: s.currency || 'CAD',
        })
      )
      .filter((s) => s.name)
      // Categories in the owner's display order, cheapest first within each.
      .sort((a, b) => a.categoryOrder - b.categoryOrder || a.price - b.price);

    return { status: 'ok', services };
  } catch {
    return { status: 'unavailable' };
  }
}
