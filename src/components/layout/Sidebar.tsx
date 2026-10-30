'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Scissors, Wallet, UserCheck, Users, Settings, ExternalLink } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

// Kept short on purpose: the barber only needs these. Older pages (staff, payroll, invoices,
// expenses) still exist at their URLs but are left out of the menu; Accounting covers money.
export const navItems = [
  { label: 'Today', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Appointments', href: '/admin/appointments', icon: Calendar },
  { label: 'Accounting', href: '/admin/accounting', icon: Wallet, adminOnly: true },
  { label: 'Customers', href: '/admin/customers', icon: UserCheck },
  { label: 'Services', href: '/admin/services', icon: Scissors },
  { label: 'Staff', href: '/admin/staff', icon: Users, adminOnly: true },
  { label: 'Settings', href: '/admin/settings', icon: Settings, adminOnly: true },
];

// A barber only sees their own appointments (enforced in the admin layout too).
export const BARBER_HOME = '/admin/appointments';
const barberItems = [{ label: 'My appointments', href: BARBER_HOME, icon: Calendar }];

// Pages only the owner/administrator may open (enforced in the admin layout too).
export const ADMIN_ONLY_ROUTES = [
  // Staff stays open to store administrators by its URL, as before; only the menu link is the owner's.
  ...navItems.filter((item) => item.adminOnly && item.href !== '/admin/staff').map((item) => item.href),
  '/admin/expenses',
  '/admin/payroll',
];

/** Bottom tab bar for phones (the sidebar only shows on large screens). */
export function MobileNav() {
  const pathname = usePathname();
  const { isAdmin, isBarber } = useAuth();
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
            {item.label}
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

  const visibleNavItems = isBarber ? barberItems : navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="w-64 bg-[var(--card)] border-r border-[var(--border)] min-h-screen flex flex-col justify-between p-4 shrink-0 hidden lg:flex transition-colors">
      <div className="space-y-6">
        {/* Logo Branding */}
        <div className="flex items-center gap-3 px-3 py-2">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.siteName}
              className="w-9 h-9 rounded-xl object-cover border border-[var(--border)]"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-black text-sm">
              BD
            </div>
          )}
          <div>
            <h2 className="font-extrabold text-sm text-[var(--foreground)] leading-tight">
              {settings.siteName}
            </h2>
            <span className="text-[10px] font-semibold text-[var(--muted-foreground)] block">
              Shop manager
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[var(--muted-foreground)]'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Customer Booking Portal Quick Link */}
      <div className="pt-4 border-t border-[var(--border)]">
        <Link
          href="/customer/book"
          target="_blank"
          className="flex items-center justify-between p-3 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] text-xs font-bold border border-[var(--primary-ring)] hover:brightness-95 transition-all"
        >
          <span>Customer Booking Wizard</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </aside>
  );
}
