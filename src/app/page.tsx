import Image from 'next/image';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { ArrowRight, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { HomeNav, BookLink } from '@/components/home/HomeNav';
import { OpenStatus, HoursTable } from '@/components/home/OpenStatus';
import { ReviewsCarousel, Stars } from '@/components/home/ReviewsCarousel';
import { BUSINESS, FULL_ADDRESS } from '@/lib/business';
import { getPublicServices } from '@/lib/server/publicCatalog';
import { getPublicReviews, getSetmoreServices } from '@/lib/server/setmore';

// Re-read services and reviews at most every 5 minutes.
export const revalidate = 300;

const display = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-display' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });

interface MenuItem {
  key: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  category: string;
  bookHref: string;
  bookExternal: boolean;
}

function formatPrice(price: number) {
  return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

// The menu comes from services the owner has published in the salon system; until any
// are, the shop's current menu is shown from its Setmore page (display only). Booking
// always happens here, on /customer/book.
async function loadMenu(): Promise<{ items: MenuItem[]; bookHref: string; bookExternal: boolean }> {
  const catalog = await getPublicServices();
  if (catalog.status === 'ok' && catalog.services.length > 0) {
    return {
      bookHref: '/customer/book',
      bookExternal: false,
      items: catalog.services.map((s) => ({
        key: s.serviceId,
        name: s.name,
        description: s.description,
        price: s.price,
        durationMinutes: s.durationMinutes,
        category: s.category,
        bookHref: `/customer/book?serviceId=${encodeURIComponent(s.serviceId)}`,
        bookExternal: false,
      })),
    };
  }

  const setmore = await getSetmoreServices();
  return {
    bookHref: '/customer/book',
    bookExternal: false,
    items: setmore.map((s) => ({
      key: s.id,
      name: s.name,
      description: s.description,
      price: s.price,
      durationMinutes: s.durationMinutes,
      category: 'Services',
      bookHref: '/customer/book',
      bookExternal: false,
    })),
  };
}

// Short teaser for the menu: skips a leading line that just repeats the service name,
// then keeps the first sentence of what's left.
function teaser(description: string, name: string) {
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
  const lines = description
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l && norm(l) !== norm(name));
  const first = lines[0] || '';
  const m = first.match(/^.{20,180}?[.!?](\s|$)/);
  if (m) return m[0].trim();
  return first.length > 160 ? `${first.slice(0, 157).trimEnd()}…` : first;
}

export default async function HomePage() {
  const [menu, reviewsData] = await Promise.all([loadMenu(), getPublicReviews()]);
  const categories = Array.from(new Set(menu.items.map((i) => i.category)));
  const rating = reviewsData ? Math.round(reviewsData.averageRating * 10) / 10 : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BarberShop',
    name: BUSINESS.name,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.address.street,
      addressLocality: BUSINESS.address.city,
      addressRegion: BUSINESS.address.region,
      postalCode: BUSINESS.address.postalCode,
      addressCountry: 'CA',
    },
    sameAs: [BUSINESS.facebookUrl],
    ...(reviewsData && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: reviewsData.averageRating,
        reviewCount: reviewsData.reviewCount,
      },
    }),
  };

  return (
    <div className={`${display.variable} ${sans.variable} home-theme min-h-screen font-sans`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeNav bookHref={menu.bookHref} bookExternal={menu.bookExternal} />

      {/* Hero */}
      <section className="hero-wash relative overflow-hidden pt-28 sm:pt-32">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:pb-28">
          <div>
            <p className="eyebrow">
              {BUSINESS.address.street.split(',')[0]} · {BUSINESS.address.city}
            </p>
            <h1 className="mt-6 font-display text-5xl leading-[1.02] text-[var(--foreground)] sm:text-6xl lg:text-7xl">
              Precision cuts.
              <br />
              <span className="accent-text">Classic shaves.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg">
              Fades, beard work and hot towel shaves in a laid-back, welcoming shop in downtown Fredericton.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <BookLink href={menu.bookHref} external={menu.bookExternal} className="cta-button px-7 py-3.5 text-sm">
                Book an appointment
              </BookLink>
              <a
                href="#services"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-7 py-3.5 text-sm text-[var(--foreground)] transition-colors hover:border-[var(--theme-primary)]/60"
              >
                View services <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {reviewsData && rating !== null && (
              <a href="#reviews" className="mt-10 inline-flex items-center gap-3 text-sm">
                <Stars rating={reviewsData.averageRating} />
                <span className="text-[var(--foreground)]">{rating.toFixed(1)}</span>
                <span className="text-[var(--muted-foreground)]">from {reviewsData.reviewCount} reviews</span>
              </a>
            )}
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute inset-6 rounded-full bg-[var(--theme-primary)]/20 blur-3xl" aria-hidden />
            <div className="relative aspect-square overflow-hidden rounded-[2rem] ring-1 ring-[var(--theme-primary)]/30 shadow-[0_30px_60px_-24px_rgba(54,46,40,0.35)]">
              <Image
                src="/bdiamond-logo.png"
                alt={`${BUSINESS.name} logo`}
                fill
                priority
                sizes="(min-width: 1024px) 384px, 80vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Quick facts */}
        <div className="relative border-t border-[var(--border)] bg-[var(--card)]">
          <div className="mx-auto grid max-w-6xl gap-px px-5 sm:grid-cols-3 sm:px-8">
            <a href={BUSINESS.mapsUrl} target="_blank" rel="noopener noreferrer" className="fact">
              <MapPin className="h-4 w-4 text-[var(--theme-primary)]" />
              <span className="text-[var(--foreground)]">{BUSINESS.address.street}</span>
            </a>
            <a href="#visit" className="fact">
              <Clock className="h-4 w-4 text-[var(--theme-primary)]" />
              <OpenStatus />
            </a>
            <a href={`tel:${BUSINESS.phone}`} className="fact">
              <Phone className="h-4 w-4 text-[var(--theme-primary)]" />
              <span className="text-[var(--foreground)]">{BUSINESS.phoneDisplay}</span>
            </a>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="scroll-mt-20 bg-[var(--background)] py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">The menu</p>
              <h2 className="mt-4 font-display text-4xl text-[var(--foreground)] sm:text-5xl">Services &amp; prices</h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-[var(--muted-foreground)]">
              All prices in {BUSINESS.currency}. Open six days a week. Book ahead to secure your time.
            </p>
          </div>

          {menu.items.length === 0 ? (
            <div className="mt-14 rounded-3xl border border-[var(--border)] p-10 text-center">
              <p className="font-display text-2xl text-[var(--foreground)]">Our menu is being updated</p>
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                Call us at{' '}
                <a href={`tel:${BUSINESS.phone}`} className="text-[var(--theme-primary)] underline-offset-4 hover:underline">
                  {BUSINESS.phoneDisplay}
                </a>{' '}
                for prices and availability.
              </p>
            </div>
          ) : (
            <div className="mt-14 space-y-14">
              {categories.map((cat) => (
                <div key={cat}>
                  {categories.length > 1 && (
                    <h3 className="mb-2 text-xs uppercase tracking-[0.3em] text-[var(--theme-primary)]">{cat}</h3>
                  )}
                  <ul className="grid gap-x-14 md:grid-cols-2">
                    {menu.items
                      .filter((i) => i.category === cat)
                      .map((item) => (
                        <li key={item.key} className="group border-b border-[var(--border)] py-6">
                          <div className="flex items-baseline gap-4">
                            <h4 className="font-display text-2xl text-[var(--foreground)]">{item.name}</h4>
                            <span className="leader" aria-hidden />
                            <span className="font-display text-2xl text-[var(--theme-primary)]">{formatPrice(item.price)}</span>
                          </div>
                          {teaser(item.description, item.name) && (
                            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted-foreground)]">
                              {teaser(item.description, item.name)}
                            </p>
                          )}
                          <div className="mt-3 flex items-center justify-between text-xs">
                            <span className="text-[var(--muted-foreground)]">{item.durationMinutes} min</span>
                            <BookLink
                              href={item.bookHref}
                              external={item.bookExternal}
                              className="inline-flex items-center gap-1.5 uppercase tracking-[0.2em] text-[var(--theme-primary)] opacity-80 transition-opacity hover:opacity-100"
                            >
                              Book <ArrowRight className="h-3 w-3" />
                            </BookLink>
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Reviews: always present so the "Reviews" link has somewhere to go */}
      <section id="reviews" className="hero-wash scroll-mt-20 py-24 sm:py-28">
        {reviewsData && reviewsData.reviews.length > 0 ? (
          <div className="mx-auto grid max-w-6xl gap-14 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow">Reviews</p>
              <h2 className="mt-4 font-display text-4xl text-[var(--foreground)] sm:text-5xl">What clients say</h2>
              <div className="mt-10 flex items-end gap-4">
                <span className="font-display text-7xl leading-none text-[var(--foreground)]">{rating?.toFixed(1)}</span>
                <div className="pb-2">
                  <Stars rating={reviewsData.averageRating} />
                  <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">{reviewsData.reviewCount} reviews</p>
                </div>
              </div>
              <p className="mt-6 max-w-xs text-sm leading-relaxed text-[var(--muted-foreground)]">
                Recent reviews from Google and verified bookings, shown as written.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={BUSINESS.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-button px-5 py-2.5 text-sm"
                >
                  More on Google
                </a>
                <a
                  href={BUSINESS.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-5 py-2.5 text-sm text-[var(--foreground)] transition-colors hover:border-[var(--theme-primary)]/60"
                >
                  Facebook
                </a>
              </div>
            </div>
            <div className="min-w-0">
              <ReviewsCarousel reviews={reviewsData.reviews} />
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
            <p className="eyebrow">Reviews</p>
            <h2 className="mt-4 font-display text-4xl text-[var(--foreground)] sm:text-5xl">What clients say</h2>
            <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-[var(--muted-foreground)]">
              Read what our customers say about us, or leave a review after your visit.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href={BUSINESS.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-button px-6 py-3 text-sm"
              >
                Google reviews
              </a>
              <a
                href={BUSINESS.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-6 py-3 text-sm text-[var(--foreground)] transition-colors hover:border-[var(--theme-primary)]/60"
              >
                Facebook
              </a>
            </div>
          </div>
        )}
      </section>

      {/* About & visit */}
      <section id="visit" className="scroll-mt-20 bg-[var(--background)] py-24 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-16 px-5 sm:px-8 lg:grid-cols-2">
          <div>
            <p className="eyebrow">The shop</p>
            <h2 className="mt-4 font-display text-4xl text-[var(--foreground)] sm:text-5xl">Where tradition meets trend</h2>
            <p className="mt-6 text-base leading-relaxed text-[var(--muted-foreground)]">{BUSINESS.about}</p>

            <ul className="mt-10 space-y-4 text-sm">
              <li>
                <a href={BUSINESS.mapsUrl} target="_blank" rel="noopener noreferrer" className="contact-row">
                  <MapPin className="h-4 w-4 shrink-0 text-[var(--theme-primary)]" />
                  {FULL_ADDRESS}
                </a>
              </li>
              <li>
                <a href={`tel:${BUSINESS.phone}`} className="contact-row">
                  <Phone className="h-4 w-4 shrink-0 text-[var(--theme-primary)]" />
                  {BUSINESS.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${BUSINESS.email}`} className="contact-row">
                  <Mail className="h-4 w-4 shrink-0 text-[var(--theme-primary)]" />
                  {BUSINESS.email}
                </a>
              </li>
              <li>
                <a href={BUSINESS.facebookUrl} target="_blank" rel="noopener noreferrer" className="contact-row">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-[var(--theme-primary)]" aria-hidden>
                    <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8.1v3h2.5V21h2.9z" />
                  </svg>
                  facebook.com/bdiamondbarbershop
                </a>
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 sm:p-10">
            <h3 className="text-xs uppercase tracking-[0.3em] text-[var(--theme-primary)]">Opening hours</h3>
            <div className="mt-6">
              <HoursTable />
            </div>
            <BookLink
              href={menu.bookHref}
              external={menu.bookExternal}
              className="cta-button mt-8 w-full py-3.5 text-sm"
            >
              Book your chair
            </BookLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] bg-[var(--muted)] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-xs text-[var(--muted-foreground)] sm:flex-row sm:px-8">
          <p>
            © {new Date().getFullYear()} {BUSINESS.name} · {BUSINESS.address.city}, {BUSINESS.address.region}
          </p>
          <div className="flex gap-6">
            <a href="/login" className="hover:text-[var(--foreground)]">
              Sign in
            </a>
            <a href={`tel:${BUSINESS.phone}`} className="hover:text-[var(--foreground)]">
              {BUSINESS.phoneDisplay}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
