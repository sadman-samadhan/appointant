import 'server-only';
import { BUSINESS } from '@/lib/business';

// Reads the shop's own public Setmore booking page (https://bdiamond.setmore.com).
// The Core Backend has no reviews module, so this is the source of real customer
// reviews (Setmore also aggregates the shop's Google reviews). It also provides the
// shop's current published service menu, used only while no services are published
// in the Core Backend. Nothing is invented: if the page can't be read, callers get null.
export interface PublicReview {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string; // ISO
  source: string; // 'google' | 'setmore'
}

export interface ReviewsResult {
  averageRating: number;
  reviewCount: number;
  reviews: PublicReview[];
}

export interface SetmoreService {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
}

async function getSetmoreCompany(): Promise<any | null> {
  try {
    const res = await fetch(BUSINESS.setmoreUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BDiamondSite/1.0)' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return null;
    return JSON.parse(match[1])?.props?.pageProps?.company ?? null;
  } catch {
    return null;
  }
}

// Setmore titles carry decorative emoji (e.g. "✂️🔥 Haircut & Hot Shave Combo").
function stripEmoji(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}‍️]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function getPublicReviews(): Promise<ReviewsResult | null> {
  const company = await getSetmoreCompany();
  const meta = company?.reviewsMeta;
  const averageRating = Number(meta?.averageRating);
  const reviewCount = Number(meta?.reviewCount);
  if (!Number.isFinite(averageRating) || !Number.isFinite(reviewCount) || reviewCount <= 0) return null;

  const raw: any[] = Array.isArray(company?.reviews) ? company.reviews : [];
  const reviews = raw
    .filter((r) => typeof r?.review === 'string' && r.review.trim().length > 0 && Number(r.rating) >= 4)
    .map(
      (r): PublicReview => ({
        id: String(r.id),
        author: String(r.author || 'Customer').trim(),
        rating: Math.max(1, Math.min(5, Math.round(Number(r.rating)))),
        text: r.review.trim(),
        date: new Date(Number(r.date) * 1000).toISOString(),
        source: String(r.source || 'setmore'),
      })
    );

  return { averageRating, reviewCount, reviews };
}

export async function getSetmoreServices(): Promise<SetmoreService[]> {
  const company = await getSetmoreCompany();
  const raw: any[] = Array.isArray(company?.services) ? company.services : [];
  return raw
    .filter((s) => s && !s.isPrivate && (s.title || s.name))
    .map((s) => ({
      id: String(s.id),
      name: stripEmoji(String(s.title || s.name)),
      description: String(s.description || '').trim(),
      price: Number(s.price) || 0,
      durationMinutes: Number(s.durationMins) || 30,
    }))
    .sort((a, b) => a.price - b.price);
}
