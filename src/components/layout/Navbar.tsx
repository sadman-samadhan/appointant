'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useT } from '@/context/LanguageContext';
import { LogOut, Sun, Moon, Plus, Footprints, Shield } from 'lucide-react';

export function Navbar() {
  const { user, logout, isAdmin, isBarber } = useAuth();
  const { settings, toggleDarkMode } = useTheme();
  const { t, lang, setLang } = useT();

  return (
    <header className="sticky top-0 z-40 bg-[var(--card)]/80 backdrop-blur-md border-b border-[var(--border)] px-4 sm:px-6 py-3 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left branding mobile indicator */}
        <div className="flex items-center gap-3">
          <Link href={isBarber ? '/admin/appointments' : '/admin/dashboard'} className="flex items-center gap-2.5 font-black text-sm text-[var(--foreground)]">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.siteName}
                className="h-8 w-auto max-w-[64px] object-contain"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center font-bold text-xs">
                AM
              </div>
            )}
            <div className="hidden sm:block">
              <span className="font-extrabold text-sm block leading-tight">{settings.siteName}</span>
              <span className="text-[10px] text-[var(--muted-foreground)] block font-medium">
                {t('York Street')}
              </span>
            </div>
          </Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!isBarber && (
            <>
              <Link
                href="/admin/appointments?new=walkin"
                className="px-3 py-2 rounded-xl text-xs font-bold btn-outline-gold flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0"
                title={t('A customer without a booking')}
              >
                <Footprints className="w-4 h-4" />
                <span className="hidden lg:inline">{t('Walk-in')}</span>
              </Link>

              <Link
                href="/admin/appointments?new=booking"
                className="btn-primary px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0"
                title={t('Book an appointment')}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden lg:inline">{t('New booking')}</span>
              </Link>
            </>
          )}

          {/* English / Arabic */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="h-[34px] min-w-[34px] px-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] transition-colors text-xs font-bold shrink-0"
            title={lang === 'ar' ? 'English' : 'العربية'}
            aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
          >
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] transition-colors"
            title={t('Day or night')}
          >
            {settings.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile / Logout */}
          <div className="flex items-center gap-2 ps-2 border-s border-[var(--border)]">
            <div className="w-8 h-8 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center font-bold text-xs border border-[var(--primary-ring)]">
              {user?.name ? user.name.charAt(0).toUpperCase() : <Shield className="w-4 h-4" />}
            </div>
            <div className="hidden lg:block text-start whitespace-nowrap">
              <p className="text-xs font-bold text-[var(--foreground)] leading-tight">{user?.name || (isAdmin ? t('Owner') : t('Staff'))}</p>
              <p className="text-[10px] text-[var(--muted-foreground)] font-medium">
                {isAdmin ? t('Owner') : isBarber ? t('Barber') : t('Staff')}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title={t('Log out')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
