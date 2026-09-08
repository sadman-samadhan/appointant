'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  Scissors,
  Calendar,
  MapPin,
  Phone,
  Star,
  ShieldCheck,
  Clock,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  LayoutDashboard,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { ServiceDto } from '@/lib/types';
import { apiRequest } from '@/lib/api/client';
import { DEFAULT_BRANCH_ID } from '@/lib/api/config';

interface GoogleReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
  source: string;
}

const STATIC_GOOGLE_REVIEWS: GoogleReview[] = [
  {
    id: 'rev-1',
    author: 'Morteza Sultani',
    rating: 5,
    date: 'Verified Google Review',
    text: 'I’m very happy with this barbershop. I’d like to thank Mr. Ghazi for the great haircut. He did an excellent job and cut my hair really well. I’m very satisfied and will definitely come back again!',
    source: 'Google Maps',
  },
  {
    id: 'rev-2',
    author: 'Steve',
    rating: 5,
    date: 'Verified Google Review',
    text: 'Best barber in town. Precision fades, respectful staff, and clean shop every single time.',
    source: 'Google Maps',
  },
  {
    id: 'rev-3',
    author: 'Joseph Ennis',
    rating: 5,
    date: 'Verified Google Review',
    text: 'Excellent hair cut, hot shave and the only place in town that does ear and nose hair waxing and all so reasonable.',
    source: 'Google Maps',
  },
  {
    id: 'rev-4',
    author: 'KILLER X 77',
    rating: 5,
    date: 'Verified Google Review',
    text: 'Very good service. They do a phenomenal job cutting hair and they are extremely polite and professional.',
    source: 'Google Maps',
  },
  {
    id: 'rev-5',
    author: 'Mano',
    rating: 5,
    date: 'Verified Google Review',
    text: 'Excellent service, very nice people and friendly. Highly recommended for top tier grooming in Fredericton.',
    source: 'Google Maps',
  },
  {
    id: 'rev-6',
    author: 'Maninder Singh',
    rating: 5,
    date: 'Verified Google Review',
    text: 'Awesome haircut and beard trim. Fresh line-ups and warm welcoming atmosphere.',
    source: 'Google Maps',
  },
];

const DEFAULT_SERVICES_CATALOG: ServiceDto[] = [
  {
    serviceId: '42fc6040-ccbd-4f89-ab42-90d85baeeb95',
    name: 'Haircut Service',
    description: 'Precision haircut, hair wash, and professional style finish tailored to your personal look.',
    price: 30.0,
    durationMinutes: 30,
    categoryName: 'Haircuts',
  },
  {
    serviceId: '7ff59032-8458-4084-bc0c-4063ee7e7625',
    name: 'Fade Haircut Service',
    description: 'High, mid, low skin fade, taper fade, or burst fade finished with straight razor crispness.',
    price: 35.0,
    durationMinutes: 35,
    categoryName: 'Haircuts',
  },
  {
    serviceId: '3407d5be-daad-4f3d-845e-88c5087acf42',
    name: 'Haircut & Beard Trim Combo',
    description: 'Full custom haircut paired with meticulous beard sculpting, hot lather, and clean line-up.',
    price: 48.0,
    durationMinutes: 45,
    categoryName: 'Combos',
  },
  {
    serviceId: '925966df-1d8c-4ca4-a70c-3dc2676d9f65',
    name: 'Hot Towel Shave',
    description: 'Traditional steam towel relaxation with organic essential oils and straight razor smooth shave.',
    price: 35.0,
    durationMinutes: 30,
    categoryName: 'Shaves',
  },
  {
    serviceId: '139ce2eb-3f4c-454b-a906-6aa87bcfa278',
    name: 'Haircut & Hot Shave Combo',
    description: 'The ultimate royal experience: precision master cut plus full hot steam towel straight razor shave.',
    price: 60.0,
    durationMinutes: 55,
    categoryName: 'Combos',
  },
  {
    serviceId: '6d21351c-0d62-4caa-a1ff-7338cced85d5',
    name: 'Beard Trim Service',
    description: 'Detailed beard trimming, length shaping, conditioning oils, and razor cheek/neck detailing.',
    price: 22.0,
    durationMinutes: 20,
    categoryName: 'Beard',
  },
  {
    serviceId: 'db140e37-f507-406c-b9d2-efdfd3d1b294',
    name: 'Senior Haircut Service (65+)',
    description: 'Classic gentlemen haircut with refined styling and gentle care at a dedicated senior rate.',
    price: 25.0,
    durationMinutes: 30,
    categoryName: 'Haircuts',
  },
  {
    serviceId: '72b04e93-f457-4b71-bc1c-f770cb627e0c',
    name: 'Kids Haircut (Age Under 10)',
    description: 'Patient, attentive haircut for boys and girls under 10 in a relaxed, friendly environment.',
    price: 22.0,
    durationMinutes: 25,
    categoryName: 'Kids',
  },
  {
    serviceId: '1d13958a-bbdd-4cb0-9fbb-796c2bb04edc',
    name: 'Face Waxing Service',
    description: 'Quick, hygienic facial hair removal for ears, nose, and brow line shaping.',
    price: 18.0,
    durationMinutes: 15,
    categoryName: 'Waxing',
  },
];

export default function PublicLandingPage() {
  const { settings } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [liveServices, setLiveServices] = useState<ServiceDto[]>(DEFAULT_SERVICES_CATALOG);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Reviews carousel state
  const [reviewIndex, setReviewIndex] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiRequest<any>(`/api/v1/services/branches/${DEFAULT_BRANCH_ID}`);
        const items = res.items || res.services || res || [];
        if (Array.isArray(items) && items.length > 0) {
          const activeOnly = items
            .filter((s: any) => s.status === 'ACTIVE' || s.isActive === true || (!s.status && s.isActive !== false))
            .map((s: any) => ({
              serviceId: s.serviceId || s.id,
              name: s.name,
              description: s.description || '',
              price: Number(s.price ?? s.basePrice ?? 0),
              durationMinutes: Number(s.durationMinutes ?? s.baseDurationMinutes ?? 30),
              categoryName: s.categoryName || 'General',
            }));
          if (activeOnly.length > 0) {
            setLiveServices(activeOnly);
          }
        }
      } catch {
        /* fallback to defaults */
      }
    }
    load();
  }, []);

  const categories = ['All', ...Array.from(new Set(liveServices.map((s) => s.categoryName || 'General')))];

  const filteredServices =
    selectedCategory === 'All'
      ? liveServices
      : liveServices.filter((s) => (s.categoryName || 'General') === selectedCategory);

  // Group services into slides of 3 cards each (or 1 on mobile)
  const itemsPerSlide = 3;
  const totalSlides = Math.ceil(filteredServices.length / itemsPerSlide);

  const nextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % Math.max(1, totalSlides));
  };

  const prevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + totalSlides) % Math.max(1, totalSlides));
  };

  const nextReview = () => {
    setReviewIndex((prev) => (prev + 1) % STATIC_GOOGLE_REVIEWS.length);
  };

  const prevReview = () => {
    setReviewIndex((prev) => (prev - 1 + STATIC_GOOGLE_REVIEWS.length) % STATIC_GOOGLE_REVIEWS.length);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] animate-fade-in">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-[var(--card)]/90 backdrop-blur-md border-b border-[var(--border)] px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.siteName}
                className="w-10 h-10 rounded-xl object-cover border border-[var(--border)]"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-black">
                BD
              </div>
            )}
            <div>
              <h1 className="font-black text-base tracking-tight leading-tight">{settings.siteName}</h1>
              <span className="text-[10px] font-semibold text-[var(--muted-foreground)] block">
                593 King St, Downtown Fredericton, NB
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <a
              href="tel:+15068832222"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] transition-all flex items-center gap-1.5 border border-[var(--border)] shadow-xs"
              title="Call Salon directly"
            >
              <Phone className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span className="hidden sm:inline">(506) 883-2222</span>
              <span className="sm:hidden">Call</span>
            </a>

            {isAuthenticated && user ? (
              <>
                {user.role === 'ADMIN' ? (
                  <Link
                    href="/admin/dashboard"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all flex items-center gap-1.5 border border-[var(--primary-ring)]"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Dashboard</span>
                  </Link>
                ) : (
                  <Link
                    href="/customer/profile"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all flex items-center gap-1.5 border border-[var(--primary-ring)]"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{user.name}</span>
                  </Link>
                )}
                <Link
                  href="/customer/book"
                  className="btn-primary px-4 py-2 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book</span>
                </Link>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 rounded-xl text-xs font-bold text-[var(--muted-foreground)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/customer/book"
                  className="btn-primary px-4 py-2 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Appointment</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-8 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-extrabold border border-[var(--primary-ring)] shadow-xs">
            <Star className="w-3.5 h-3.5 fill-[var(--primary)]" />
            <span>4.8 Rating • 254 Verified Google Reviews</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
            Master Grooming & Modern Styling in Fredericton
          </h1>

          <p className="text-sm sm:text-base text-[var(--muted-foreground)] font-medium leading-relaxed max-w-xl">
            Welcome to {settings.siteName}. Experience master barbers, precision skin fades, traditional steam towel hot shaves, and beard sculpting at Downtown Fredericton.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/customer/book"
              className="btn-primary px-7 py-3.5 rounded-2xl text-xs font-black shadow-lg flex items-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <span>Book Appointment Online</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Clickable Call Button */}
            <a
              href="tel:+15068832222"
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[var(--card)] hover:bg-[var(--muted)] text-xs font-bold text-[var(--foreground)] border border-[var(--border)] shadow-sm hover:border-[var(--primary)] transition-all"
            >
              <Phone className="w-4 h-4 text-[var(--primary)] shrink-0" />
              <span>Call (506) 883-2222</span>
            </a>
          </div>

          <div className="flex items-center gap-6 pt-4 text-xs font-semibold text-[var(--muted-foreground)]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Walk-ins Welcome</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--primary)]" />
              <span>Mon-Sat 9AM - 6PM</span>
            </div>
          </div>
        </div>

        {/* Hero Photo Card */}
        <div className="glass-card p-3 rounded-3xl overflow-hidden shadow-2xl border border-[var(--border)]">
          <div className="relative h-80 sm:h-96 rounded-2xl overflow-hidden bg-[var(--muted)] flex items-center justify-center">
            {settings.featuredImageUrl ? (
              <img
                src={settings.featuredImageUrl}
                alt="B Diamond Salon Studio"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-8 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[var(--primary)] text-white flex items-center justify-center mx-auto shadow-md">
                  <Scissors className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-[var(--foreground)]">{settings.siteName}</h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  593 King Street, Downtown Fredericton, New Brunswick
                </p>
              </div>
            )}
            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-[var(--card)]/90 backdrop-blur-md border border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold">
                <MapPin className="w-4 h-4 text-[var(--primary)]" />
                <span>Downtown Fredericton Main Branch</span>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border border-emerald-200">
                OPEN TODAY
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section - Full-Viewport Carousel / Slider */}
      <section className="py-14 bg-[var(--card)]/40 border-y border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[var(--primary)] uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Service Catalog</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--foreground)]">
                Our Signature Services & Rates
              </h2>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)] font-medium mt-1">
                Swipe or use arrows to view services. Select any service to reserve your preferred specialist.
              </p>
            </div>

            {/* Carousel Navigation Controls */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={prevSlide}
                className="p-2.5 rounded-xl bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] transition-all border border-[var(--border)] active:scale-95 shadow-xs"
                title="Previous services slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextSlide}
                className="p-2.5 rounded-xl bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] transition-all border border-[var(--border)] active:scale-95 shadow-xs"
                title="Next services slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentSlideIndex(0);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[var(--primary)] text-white shadow-md font-black'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Carousel Slide Track */}
          <div className="relative overflow-hidden">
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 transition-all duration-500 ease-out"
            >
              {filteredServices
                .slice(currentSlideIndex * itemsPerSlide, currentSlideIndex * itemsPerSlide + itemsPerSlide)
                .map((srv) => (
                  <div
                    key={srv.serviceId}
                    className="glass-card p-6 rounded-3xl flex flex-col justify-between border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-xl transition-all group bg-[var(--card)] relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary-ring)]">
                          {srv.categoryName || 'Service'}
                        </span>
                        <div className="text-right">
                          <span className="text-lg font-black text-[var(--foreground)] block leading-tight">
                            ${srv.price.toFixed(2)}
                          </span>
                          <span className="text-[10px] font-bold text-[var(--muted-foreground)]">CAD</span>
                        </div>
                      </div>

                      <h3 className="text-base font-black text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                        {srv.name}
                      </h3>

                      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed font-medium line-clamp-2">
                        {srv.description || 'Master grooming and traditional care by certified stylists.'}
                      </p>
                    </div>

                    <div className="pt-5 mt-5 border-t border-[var(--border)] flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--muted-foreground)] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                        <span>{srv.durationMinutes} mins</span>
                      </span>

                      <Link
                        href={`/customer/book?serviceId=${srv.serviceId}`}
                        className="btn-primary px-4 py-2 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 group-hover:scale-105 transition-transform"
                      >
                        <span>Book Now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Slider Pagination Dots */}
          {totalSlides > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    currentSlideIndex === idx
                      ? 'w-7 bg-[var(--primary)]'
                      : 'w-2 bg-[var(--border-strong)] hover:bg-[var(--muted-foreground)]'
                  }`}
                  title={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Google Reviews Section (Static Phase 1 Data) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-16 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 text-xs font-extrabold">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>Google Maps Verified Reviews</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Loved by Clients Across Fredericton
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] font-medium">
              Over 254 verified reviews with a 4.8 average star rating on Google.
            </p>
          </div>

          {/* Review navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevReview}
              className="p-2.5 rounded-xl bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)]"
              title="Previous review"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextReview}
              className="p-2.5 rounded-xl bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)]"
              title="Next review"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reviews Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[0, 1, 2].map((offset) => {
            const rev = STATIC_GOOGLE_REVIEWS[(reviewIndex + offset) % STATIC_GOOGLE_REVIEWS.length];
            return (
              <div
                key={rev.id}
                className="glass-card p-6 rounded-3xl flex flex-col justify-between border border-[var(--border)] space-y-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-full">
                      {rev.source}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--foreground)] leading-relaxed italic font-medium">
                    &ldquo;{rev.text}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-[var(--border)]">
                  <div className="w-9 h-9 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center font-black text-xs border border-[var(--primary-ring)]">
                    {rev.author.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[var(--foreground)] leading-tight">{rev.author}</h4>
                    <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {rev.date}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Location & Hours Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 border-t border-[var(--border)] grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-6 rounded-3xl space-y-4 border border-[var(--border)]">
          <h3 className="text-base font-black flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--primary)]" />
            Location & Contact
          </h3>
          <div className="space-y-2 text-xs font-medium text-[var(--muted-foreground)]">
            <p className="font-bold text-sm text-[var(--foreground)]">593 King Street, Downtown</p>
            <p>Fredericton, New Brunswick E3B 1E8</p>
            <p className="pt-2">
              <a
                href="tel:+15068832222"
                className="inline-flex items-center gap-2 font-bold text-[var(--primary)] hover:underline text-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call +1 (506) 883-2222</span>
              </a>
            </p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl space-y-4 border border-[var(--border)]">
          <h3 className="text-base font-black flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--primary)]" />
            Working Hours
          </h3>
          <div className="space-y-2 text-xs font-medium text-[var(--muted-foreground)]">
            <div className="flex justify-between py-1 border-b border-[var(--border)]">
              <span>Monday – Saturday</span>
              <span className="font-bold text-[var(--foreground)]">09:00 AM – 06:00 PM</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Sunday</span>
              <span className="font-bold text-[var(--primary)]">Closed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--muted-foreground)] font-medium">
        <p>© {new Date().getFullYear()} {settings.siteName} • Downtown Fredericton, NB • All Rights Reserved</p>
      </footer>
    </div>
  );
}
