'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { Scissors, User, Calendar, Home } from 'lucide-react';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { settings } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--card)]/90 backdrop-blur-md border-b border-[var(--border)] px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.siteName}
                className="w-8 h-8 rounded-lg object-cover border border-[var(--border)]"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center font-black text-xs">
                BD
              </div>
            )}
            <span className="font-extrabold text-sm text-[var(--foreground)]">{settings.siteName}</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <Link
              href="/customer/profile"
              className="text-xs font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1"
            >
              <User className="w-3.5 h-3.5" />
              <span>My Profile</span>
            </Link>
            <Link
              href="/customer/book"
              className="btn-primary px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 animate-fade-in">{children}</main>
    </div>
  );
}
