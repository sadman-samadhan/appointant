'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { LogOut, Sun, Moon, Plus, Wallet, Shield } from 'lucide-react';

interface NavbarProps {
  onOpenCashModal?: () => void;
}

export function Navbar({ onOpenCashModal }: NavbarProps) {
  const { user, logout, isAdmin } = useAuth();
  const { settings, toggleDarkMode } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-[var(--card)]/80 backdrop-blur-md border-b border-[var(--border)] px-4 sm:px-6 py-3 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left branding mobile indicator */}
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 font-black text-sm text-[var(--foreground)]">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.siteName}
                className="w-8 h-8 rounded-lg object-cover border border-[var(--border)]"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center font-bold text-xs">
                BD
              </div>
            )}
            <div className="hidden sm:block">
              <span className="font-extrabold text-sm block leading-tight">{settings.siteName}</span>
              <span className="text-[10px] text-[var(--muted-foreground)] block font-medium">
                Downtown Main (BD-DT01)
              </span>
            </div>
          </Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenCashModal && (
            <button
              onClick={onOpenCashModal}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Record Cash</span>
            </button>
          )}

          <Link
            href="/admin/appointments"
            className="btn-primary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Booking</span>
          </Link>

          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] transition-colors"
            title="Toggle theme"
          >
            {settings.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile / Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
            <div className="w-8 h-8 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center font-bold text-xs border border-[var(--primary-ring)]">
              {user?.name ? user.name.charAt(0).toUpperCase() : <Shield className="w-4 h-4" />}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-[var(--foreground)] leading-tight">{user?.name || (isAdmin ? 'Admin User' : 'Specialist')}</p>
              <p className="text-[10px] text-[var(--muted-foreground)] font-medium">
                {isAdmin ? 'Salon Owner / Admin' : (user?.roleName || 'Staff Specialist')}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
