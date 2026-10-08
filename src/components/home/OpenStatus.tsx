'use client';

import React, { useEffect, useState } from 'react';
import { BUSINESS } from '@/lib/business';

// Fredericton is on Atlantic time; compute in the shop's zone, not the visitor's.
const SHOP_TIME_ZONE = 'America/Moncton';

function toMinutes(label: string) {
  const m = label.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + Number(m[2]);
}

function shopNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SHOP_TIME_ZONE,
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  return { day: get('weekday'), minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

export function useShopToday() {
  const [today, setToday] = useState<string | null>(null);
  const [status, setStatus] = useState<{ open: boolean; text: string } | null>(null);

  useEffect(() => {
    const update = () => {
      const { day, minutes } = shopNow();
      setToday(day);
      const hours = BUSINESS.hours.find((h) => h.day === day);
      if (hours?.open && hours.close) {
        const open = toMinutes(hours.open);
        const close = toMinutes(hours.close);
        if (minutes >= open && minutes < close) {
          setStatus({ open: true, text: `Open now · until ${hours.close}` });
          return;
        }
        if (minutes < open) {
          setStatus({ open: false, text: `Closed · opens ${hours.open}` });
          return;
        }
      }
      const idx = BUSINESS.hours.findIndex((h) => h.day === day);
      for (let i = 1; i <= 7; i++) {
        const next = BUSINESS.hours[(idx + i) % 7];
        if (next.open) {
          setStatus({ open: false, text: `Closed · opens ${i === 1 ? 'tomorrow' : next.day} ${next.open}` });
          return;
        }
      }
      setStatus(null);
    };
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);

  return { today, status };
}

export function OpenStatus() {
  const { status } = useShopToday();
  if (!status) return <span className="text-[var(--muted-foreground)]">See opening hours</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${status.open ? 'bg-emerald-500' : 'bg-[var(--muted-foreground)]'}`} aria-hidden />
      <span className="text-[var(--foreground)]">{status.text}</span>
    </span>
  );
}

export function HoursTable() {
  const { today } = useShopToday();
  return (
    <dl className="divide-y divide-[var(--border)]">
      {BUSINESS.hours.map((h) => {
        const isToday = h.day === today;
        return (
          <div key={h.day} className="flex items-center justify-between py-2.5 text-sm">
            <dt className={isToday ? 'font-medium text-[var(--theme-primary)]' : 'text-[var(--muted-foreground)]'}>
              {h.day}
              {isToday && <span className="ml-2 text-[10px] uppercase tracking-[0.2em]">Today</span>}
            </dt>
            <dd className={isToday ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}>
              {h.open ? `${h.open} – ${h.close}` : 'Closed'}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
