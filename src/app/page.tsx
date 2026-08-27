'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Scissors, Calendar, MapPin, Phone, Star, ShieldCheck, Clock, ArrowRight, User, LogOut, LayoutDashboard } from 'lucide-react';

import { ServiceDto } from '@/lib/types';
import { apiRequest } from '@/lib/api/client';
import { DEFAULT_BRANCH_ID } from '@/lib/api/config';

export default function PublicLandingPage() {
  const { settings } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [liveServices, setLiveServices] = React.useState<ServiceDto[]>([]);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await apiRequest<any>(`/api/v1/services/branches/${DEFAULT_BRANCH_ID}`);
        const items = res.items || res.services || res || [];
        if (Array.isArray(items) && items.length > 0) {
          setLiveServices(
            items.map((s: any) => ({
              serviceId: s.serviceId || s.id,
              name: s.name,
              price: Number(s.price ?? s.basePrice ?? 0),
              durationMinutes: Number(s.durationMinutes ?? s.baseDurationMinutes ?? 30),
              categoryName: s.categoryName,
            }))
          );
        }
      } catch {
        /* fallback */
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] animate-fade-in">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-[var(--card)]/90 backdrop-blur-md border-b border-[var(--border)] px-4 sm:px-8 py-4">
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
                593 King St, Fredericton, NB
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                {user.role === 'ADMIN' ? (
                  <Link
                    href="/admin/dashboard"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all flex items-center gap-1.5 border border-[var(--primary-ring)]"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Admin Dashboard</span>
                  </Link>
                ) : (
                  <Link
                    href="/customer/profile"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all flex items-center gap-1.5 border border-[var(--primary-ring)]"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>My Profile ({user.name})</span>
                  </Link>
                )}
                <Link
                  href="/customer/book"
                  className="btn-primary px-5 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Appointment</span>
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/customer/book"
                  className="btn-primary px-5 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5"
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
      <section className="relative max-w-7xl mx-auto px-4 sm:px-8 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-extrabold border border-[var(--primary-ring)]">
            <Star className="w-3.5 h-3.5 fill-[var(--primary)]" />
            <span>4.8 Rating (251 Verified Reviews)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Premium Barbering & Salon Experience in Fredericton
          </h1>

          <p className="text-sm sm:text-base text-[var(--muted-foreground)] font-medium leading-relaxed">
            Welcome to {settings.siteName}. Experience master styling, precision fade cuts, and traditional hot towel shaves at Downtown Fredericton.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/customer/book"
              className="btn-primary px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg flex items-center gap-2"
            >
              <span>Book Appointment Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[var(--muted)] text-xs font-bold text-[var(--foreground)] border border-[var(--border)]">
              <Phone className="w-4 h-4 text-[var(--primary)]" />
              <span>+1 (506) 883-2222</span>
            </div>
          </div>
        </div>

        {/* Hero Photo Card */}
        <div className="glass-card p-3 rounded-3xl overflow-hidden shadow-2xl border border-[var(--border)]">
          <div className="relative h-80 sm:h-96 rounded-2xl overflow-hidden bg-[var(--muted)] flex items-center justify-center">
            {settings.featuredImageUrl ? (
              <img
                src={settings.featuredImageUrl}
                alt="Salon Interior"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-8 space-y-2">
                <Scissors className="w-12 h-12 text-[var(--primary)] mx-auto" />
                <h3 className="text-lg font-black text-[var(--foreground)]">B Diamond Studio</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Downtown Fredericton, New Brunswick</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Services Catalog Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 border-t border-[var(--border)] space-y-8">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl font-black tracking-tight">Our Services & Pricing</h2>
          <p className="text-xs text-[var(--muted-foreground)] font-medium">
            Select a service below to start your online appointment booking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {liveServices.length === 0 ? (
            <div className="col-span-full p-8 text-center glass-card rounded-2xl border border-[var(--border)] text-xs text-[var(--muted-foreground)]">
              Services will appear here once configured in the salon catalog.
            </div>
          ) : (
            liveServices.map((srv) => (
              <div
                key={srv.serviceId}
                className="glass-card p-5 rounded-2xl flex items-center justify-between gap-4 border border-[var(--border)] hover:border-[var(--primary)] transition-all"
              >
                <div>
                  <h3 className="text-xs font-black text-[var(--foreground)]">{srv.name}</h3>
                  <span className="text-[11px] text-[var(--muted-foreground)] font-medium flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-[var(--primary)]" />
                    {srv.durationMinutes} mins {srv.categoryName ? `· ${srv.categoryName}` : ''}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-[var(--foreground)] block">
                    ${srv.price.toFixed(2)} CAD
                  </span>
                  <Link
                    href="/customer/book"
                    className="text-[11px] font-bold text-[var(--primary)] hover:underline"
                  >
                    Book →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Location & Hours Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 border-t border-[var(--border)] grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-6 rounded-2xl space-y-4 border border-[var(--border)]">
          <h3 className="text-base font-black flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--primary)]" />
            Location & Contact
          </h3>
          <div className="space-y-2 text-xs font-medium text-[var(--muted-foreground)]">
            <p className="font-bold text-[var(--foreground)]">593 King Street, Downtown</p>
            <p>Fredericton, New Brunswick E3B 1E8</p>
            <p>Phone: +1 506 883 2222</p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-4 border border-[var(--border)]">
          <h3 className="text-base font-black flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--primary)]" />
            Working Hours
          </h3>
          <div className="space-y-1.5 text-xs font-medium text-[var(--muted-foreground)]">
            <div className="flex justify-between py-1 border-b border-[var(--border)]">
              <span>Monday - Saturday</span>
              <span className="font-bold text-[var(--foreground)]">09:00 AM - 06:00 PM</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Sunday</span>
              <span className="font-bold text-[var(--primary)]">Closed</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
