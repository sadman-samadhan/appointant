'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Scissors, Wallet, UserCheck, Users, Settings, ExternalLink, Receipt, Building2, Landmark, Briefcase } from 'lucide-react';
import { useT } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

// The everyday pages. The money pages (expenses, vendors, bank, payroll) sit in their own group below.
export const navItems = [
  { label: 'Today', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Appointments', short: 'Bookings', href: '/admin/appointments', icon: Calendar },
  { label: 'Accounting', href: '/admin/accounting', icon: Wallet, adminOnly: true },
  { label: 'Customers', href: '/admin/customers', icon: UserCheck },
  { label: 'Services', href: '/admin/services', icon: Scissors },
  { label: 'Staff', href: '/admin/staff', icon: Users, adminOnly: true },
  { label: 'Settings', href: '/admin/settings', icon: Settings, adminOnly: true },
];

// Owner only. On phones they're reached from the Accounting page's shortcuts.
export const moneyItems = [
  { label: 'Expenses', href: '/admin/expenses', icon: Receipt },
  { label: 'Vendors', href: '/admin/vendors', icon: Building2 },
  { label: 'Bank import', href: '/admin/bank', icon: Landmark },
  { label: 'Payroll', href: '/admin/payroll', icon: Briefcase },
];

// A barber only sees their own appointments (enforced in the admin layout too).
export const BARBER_HOME = '/admin/appointments';
const barberItems = [{ label: 'My appointments', href: BARBER_HOME, icon: Calendar }];

// Pages only the owner/administrator may open (enforced in the admin layout too).
export const ADMIN_ONLY_ROUTES = [
  // Staff stays open to store administrators by its URL, as before; only the menu link is the owner's.
  ...navItems.filter((item) => item.adminOnly && item.href !== '/admin/staff').map((item) => item.href),
  ...moneyItems.map((item) => item.href),
];

/** Bottom tab bar for phones (the sidebar only shows on large screens). */
export function MobileNav() {
  const pathname = usePathname();
  const { isAdmin, isBarber } = useAuth();
  const { t } = useT();
  // A single tab is no use to a barber on a phone.
  if (isBarber) return null;
  const items = navItems.filter((item) => (!item.adminOnly || isAdmin) && item.href !== '/admin/settings');
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--card)] border-t border-[var(--border)] grid pb-[env(safe-area-inset-bottom)]" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold ${active ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}
          >
            <Icon className="w-5 h-5" />
            <span className="max-w-full truncate px-0.5">{t('short' in item && item.short ? item.short : item.label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { settings } = useTheme();
  const { isAdmin, isBarber } = useAuth();
  const { t } = useT();

  const visibleNavItems = isBarber ? barberItems : navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="w-64 bg-[var(--card)] border-e border-[var(--border)] min-h-screen flex flex-col justify-between p-4 shrink-0 hidden lg:flex transition-colors">
      <div className="space-y-6">
        {/* Logo Branding */}
        <div className="flex items-center gap-3 px-3 py-2">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.siteName}
              className="h-9 w-auto max-w-[64px] object-contain"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center font-black text-sm">
              AM
            </div>
          )}
          <div>
            <h2 className="font-extrabold text-sm text-[var(--foreground)] leading-tight">
              {settings.siteName}
            </h2>
            <span className="text-[10px] font-semibold text-[var(--muted-foreground)] block">
              {t('Shop manager')}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {visibleNavItems.map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href || !!pathname?.startsWith(`${item.href}/`)} label={t(item.label)} />
          ))}
        </nav>

        {isAdmin && !isBarber && (
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">{t('Money')}</p>
            {moneyItems.map((item) => (
              <NavLink key={item.href} item={item} active={pathname === item.href || !!pathname?.startsWith(`${item.href}/`)} label={t(item.label)} />
            ))}
          </div>
        )}
      </div>

      {/* Customer Booking Portal Quick Link */}
      <div className="pt-4 border-t border-[var(--border)]">
        <Link
          href="/customer/book"
          target="_blank"
          className="flex items-center justify-between p-3 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] text-xs font-bold border border-[var(--primary-ring)] hover:brightness-95 transition-all"
        >
          <span>{t('Open the booking page')}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </aside>
  );
}

function NavLink({ item, active, label }: { item: { href: string; icon: React.ElementType }; active: boolean; label: string }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
        active
          ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm'
          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
      }`}
    >
      <Icon className={`w-4 h-4 ${active ? 'text-[var(--primary-foreground)]' : 'text-[var(--muted-foreground)]'}`} />
      <span>{label}</span>
    </Link>
  );
}
