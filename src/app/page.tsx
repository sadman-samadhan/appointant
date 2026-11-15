import Image from 'next/image';
import { ArrowRight, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { HomeNav, BookLink } from '@/components/home/HomeNav';
import { OpenStatus, HoursTable } from '@/components/home/OpenStatus';
import { ReviewsCarousel, Stars } from '@/components/home/ReviewsCarousel';
import { BUSINESS, FULL_ADDRESS } from '@/lib/business';
import { getPublicServices } from '@/lib/server/publicCatalog';
import { getPublicReviews, getSetmoreServices } from '@/lib/server/setmore';

// Re-read services and reviews at most every 5 minutes.
export const revalidate = 300;


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
  const fallback =
    setmore.length > 0
      ? setmore.map((s) => ({ key: s.id, name: s.name, description: s.description, price: s.price, durationMinutes: s.durationMinutes }))
      : BUSINESS.menu.map((m) => ({ key: m.name, name: m.name, description: m.description, price: m.price, durationMinutes: m.minutes }));
  return {
    bookHref: '/customer/book',
    bookExternal: false,
    items: fallback.map((s) => ({ ...s, category: 'Services', bookHref: '/customer/book', bookExternal: false })),
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
  // Reviews from Setmore when the shop has a page there; otherwise the rating on its booking app.
  const ratingAvg = reviewsData?.averageRating ?? BUSINESS.rating.average;
  const ratingCount = reviewsData?.reviewCount ?? BUSINESS.rating.count;
  const rating = Math.round(ratingAvg * 10) / 10;

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
    sameAs: [BUSINESS.facebookUrl, BUSINESS.bookingSiteUrl].filter(Boolean),
    aggregateRating: { '@type': 'AggregateRating', ratingValue: ratingAvg, reviewCount: ratingCount },
  };

  return (
    <div className="home-theme min-h-screen font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeNav bookHref={menu.bookHref} bookExternal={menu.bookExternal} />

      {/* Hero: the shop itself, gold Deco rays only up here */}
      <section className="hero-wash relative overflow-hidden pt-24 sm:pt-28">
        <div className="hero-rays pointer-events-none absolute inset-x-0 top-0 h-[38rem]" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 sm:px-8 lg:grid-cols-[1fr_1fr] lg:pb-24">
          <div className="lg:py-10">
            <p className="deco-rule text-[11px] font-semibold uppercase tracking-[0.4em]">
              {BUSINESS.address.street} · {BUSINESS.address.city}
            </p>
            <h1 className="mt-7 font-display text-[2.6rem] leading-[1.08] text-[var(--foreground)] sm:text-6xl">
              Sharp fades.
              <br />
              <span className="metal-gold">Gold standard.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg">
              Fades, textured cuts, hot towel shaves and the signature AM Treatment, on York Street in downtown
              Fredericton. Walk-ins welcome.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <BookLink href={menu.bookHref} external={menu.bookExternal} className="cta-button px-7 py-3.5 text-xs">
                Book an appointment
              </BookLink>
              <a
                href="#services"
                className="inline-flex items-center gap-2 rounded-sm border border-[var(--theme-primary)]/50 px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)] transition-colors hover:bg-[var(--primary-light)]"
              >
                View services <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <a href="#reviews" className="mt-10 inline-flex items-center gap-3 text-sm">
              <Stars rating={ratingAvg} />
              <span className="font-semibold text-[var(--foreground)]">{rating.toFixed(1)}</span>
              <span className="text-[var(--muted-foreground)]">from {ratingCount} reviews</span>
            </a>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 border border-[var(--theme-primary)]/35" aria-hidden />
            <div className="relative aspect-[4/3] overflow-hidden shadow-[0_30px_70px_-30px_var(--primary-ring)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://cdn.barberly.com/ambarbershop/ad7f20e23f.webp"
                alt="Inside AM Barbershop: black and gold barber chairs"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" aria-hidden />
            </div>
            <Image
              src="/am-icon.svg"
              alt={`${BUSINESS.name} logo`}
              width={112}
              height={112}
              priority
              className="absolute -bottom-8 -left-4 h-24 w-24 drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)] sm:-left-8 sm:h-28 sm:w-28"
            />
          </div>
        </div>

        {/* Quick facts */}
        <div className="relative border-y border-[var(--border)] bg-[var(--card)]">
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
              <p className="deco-rule text-[11px] font-semibold uppercase tracking-[0.4em]">The menu</p>
              <h2 className="mt-4 font-display text-4xl text-[var(--foreground)] sm:text-5xl">Services &amp; prices</h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-[var(--muted-foreground)]">
              All prices in {BUSINESS.currency}. Open Monday to Saturday. Walk-ins welcome, or book ahead to secure your time.
            </p>
          </div>

          {menu.items.length === 0 ? (
            <div className="mt-14 rounded-sm border border-[var(--border)] p-10 text-center">
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
        <div className={`mx-auto max-w-6xl px-5 sm:px-8 ${reviewsData && reviewsData.reviews.length > 0 ? 'grid gap-14 lg:grid-cols-[0.8fr_1.2fr]' : 'text-center'}`}>
          <div>
            <p className={`deco-rule text-[11px] font-semibold uppercase tracking-[0.4em] ${reviewsData && reviewsData.reviews.length > 0 ? '' : 'justify-center'}`}>Reviews</p>
            <h2 className="mt-4 font-display text-4xl text-[var(--foreground)] sm:text-5xl">What clients say</h2>
            <div className={`mt-10 flex items-end gap-4 ${reviewsData && reviewsData.reviews.length > 0 ? '' : 'justify-center'}`}>
              <span className="metal-gold font-display text-7xl leading-none">{rating.toFixed(1)}</span>
              <div className="pb-2 text-left">
                <Stars rating={ratingAvg} />
                <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">{ratingCount} reviews</p>
              </div>
            </div>
            <div className={`mt-8 flex flex-wrap gap-3 ${reviewsData && reviewsData.reviews.length > 0 ? '' : 'justify-center'}`}>
              <a href={BUSINESS.mapsUrl} target="_blank" rel="noopener noreferrer" className="cta-button px-6 py-3 text-xs">
                Google reviews
              </a>
              {BUSINESS.facebookUrl && (
                <a
                  href={BUSINESS.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-sm border border-[var(--theme-primary)]/50 px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)] transition-colors hover:bg-[var(--primary-light)]"
                >
                  Facebook
                </a>
              )}
            </div>
          </div>
          {reviewsData && reviewsData.reviews.length > 0 && (
            <div className="min-w-0">
              <ReviewsCarousel reviews={reviewsData.reviews} />
            </div>
          )}
        </div>
      </section>

      {/* About & visit */}
      <section id="visit" className="scroll-mt-20 bg-[var(--background)] py-24 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-16 px-5 sm:px-8 lg:grid-cols-2">
          <div>
            <p className="deco-rule text-[11px] font-semibold uppercase tracking-[0.4em]">The shop</p>
            <h2 className="mt-4 font-display text-4xl text-[var(--foreground)] sm:text-5xl">Black, gold and sharp</h2>
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
              {BUSINESS.email && (
                <li>
                  <a href={`mailto:${BUSINESS.email}`} className="contact-row">
                    <Mail className="h-4 w-4 shrink-0 text-[var(--theme-primary)]" />
                    {BUSINESS.email}
                  </a>
                </li>
              )}
              {BUSINESS.facebookUrl && (
              <li>
                <a href={BUSINESS.facebookUrl} target="_blank" rel="noopener noreferrer" className="contact-row">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-[var(--theme-primary)]" aria-hidden>
                    <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8.1v3h2.5V21h2.9z" />
                  </svg>
                  Facebook
                </a>
              </li>
              )}
            </ul>
          </div>

          <div className="relative border border-[var(--theme-primary)]/35 bg-[var(--card)] p-8 shadow-[0_24px_60px_-30px_var(--primary-ring)] sm:p-10">
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
