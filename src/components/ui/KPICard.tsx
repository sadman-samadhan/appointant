import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
  accentColor?: string;
  iconBgColor?: string;
}

export function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  accentColor = 'text-[var(--primary)]',
  iconBgColor = 'bg-[var(--primary-light)]',
}: KPICardProps) {
  return (
    <div className="glass-card p-5 rounded-2xl transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${iconBgColor} ${accentColor} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3">
        <span className="text-2xl font-black text-[var(--foreground)] tracking-tight">{value}</span>
        <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 font-medium">{sub}</p>
      </div>
    </div>
  );
}
