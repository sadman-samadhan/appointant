'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BUSINESS } from '@/lib/business';

export function HomeNav({ bookHref, bookExternal }: { bookHref: string; bookExternal: boolean }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [open, setOpen] = useState(false);

  const accountHref = user?.role === 'ADMIN' || user?.role === 'STAFF' ? '/admin/dashboard' : '/customer/profile';
  const links = [
    { href: '#services', label: 'Services' },
    { href: '#reviews', label: 'Reviews' },
    { href: '#visit', label: 'Visit' },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[var(--card)]/85 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label={`${BUSINESS.name} home`}>
          <Image
            src="/bdiamond-logo.png"
            alt=""
            width={40}
            height={40}
            priority
            className="h-10 w-10 rounded-full ring-1 ring-[var(--theme-primary)]/40"
          />
          <span className="leading-none">
            <span className="block font-display text-lg tracking-[0.18em] text-[var(--foreground)]">B DIAMOND</span>
            <span className="mt-1 block text-[10px] uppercase tracking-[0.35em] text-[var(--theme-primary)]">Barbershop</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {!isLoading &&
            (isAuthenticated ? (
              <Link href={accountHref} className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
                {user?.role === 'CUSTOMER' ? 'My account' : 'Dashboard'}
              </Link>
            ) : (
              <Link href="/login" className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
                Sign in
              </Link>
            ))}
          <BookLink href={bookHref} external={bookExternal} className="cta-button px-5 py-2 text-sm">
            Book now
          </BookLink>
        </div>

        <button
          className="rounded-lg p-2 text-[var(--foreground)] md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-[var(--border)] px-5 pb-5 md:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              {l.label}
            </a>
          ))}
          <Link
            href={isAuthenticated ? accountHref : '/login'}
            className="block py-3 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            {isAuthenticated ? (user?.role === 'CUSTOMER' ? 'My account' : 'Dashboard') : 'Sign in'}
          </Link>
          <BookLink href={bookHref} external={bookExternal} className="cta-button mt-2 w-full py-3 text-sm">
            Book now
          </BookLink>
        </div>
      )}
    </header>
  );
}

export function BookLink({
  href,
  external,
  className,
  children,
}: {
  href: string;
  external: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
