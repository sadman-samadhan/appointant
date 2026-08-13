'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Scissors,
  Users,
  Receipt,
  BookOpen,
  DollarSign,
  Briefcase,
  UserCheck,
  Palette,
  ExternalLink,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Appointments', href: '/admin/appointments', icon: Calendar },
  { label: 'Services', href: '/admin/services', icon: Scissors },
  { label: 'Staff & Shifts', href: '/admin/staff', icon: Users },
  { label: 'Invoices & Cash', href: '/admin/invoices', icon: Receipt },
  { label: 'Accounting', href: '/admin/accounting', icon: BookOpen },
  { label: 'Expenses', href: '/admin/expenses', icon: DollarSign },
  { label: 'Payroll', href: '/admin/payroll', icon: Briefcase },
  { label: 'Customers CRM', href: '/admin/customers', icon: UserCheck },
  { label: 'Theme Studio', href: '/admin/settings', icon: Palette },
];

export function Sidebar() {
  const pathname = usePathname();
  const { settings } = useTheme();

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
              Fredericton OS
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
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
