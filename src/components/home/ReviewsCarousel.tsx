'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

export interface CarouselReview {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  source: string;
}

const AUTO_ADVANCE_MS = 7000;

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return '';
  if (days < 1) return 'Today';
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (days < 31) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${days < 60 ? '' : 's'} ago`;
  return `${Math.floor(days / 365)} year${days < 730 ? '' : 's'} ago`;
}

export function Stars({ rating, size = 'h-4 w-4' }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${i <= Math.round(rating) ? 'fill-[var(--theme-primary)] text-[var(--theme-primary)]' : 'text-[var(--border-strong)]'}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function ReviewsCarousel({ reviews }: { reviews: CarouselReview[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const count = reviews.length;

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => go(1), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused, count, go]);

  if (count === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStart.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touchStart.current = null;
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Customer reviews"
    >
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {reviews.map((r, i) => (
            <figure
              key={r.id}
              className="w-full shrink-0 px-2 sm:px-12"
              aria-hidden={i !== index}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
            >
              <Stars rating={r.rating} />
              <blockquote className="mt-6 font-display text-2xl leading-snug text-[var(--foreground)] sm:text-3xl">
                “{r.text}”
              </blockquote>
              <figcaption className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium text-[var(--foreground)]">{r.author}</span>
                <span className="text-[var(--border-strong)]" aria-hidden>
                  ·
                </span>
                <span className="text-[var(--muted-foreground)]">
                  {r.source === 'google' ? 'Google review' : 'Verified booking'}
                  {timeAgo(r.date) ? ` · ${timeAgo(r.date)}` : ''}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {count > 1 && (
        <div className="mt-10 flex items-center justify-between sm:px-12">
          <div className="flex gap-2" role="tablist" aria-label="Choose review">
            {reviews.map((r, i) => (
              <button
                key={r.id}
                onClick={() => setIndex(i)}
                role="tab"
                aria-selected={i === index}
                aria-label={`Review ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-8 bg-[var(--theme-primary)]' : 'w-3 bg-[var(--border-strong)] hover:bg-[var(--muted-foreground)]'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => go(-1)}
              aria-label="Previous review"
              className="rounded-full border border-[var(--border)] p-2.5 text-[var(--foreground)] transition-colors hover:border-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next review"
              className="rounded-full border border-[var(--border)] p-2.5 text-[var(--foreground)] transition-colors hover:border-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        Review {index + 1} of {count}
      </p>
    </div>
  );
}
