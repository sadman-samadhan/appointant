'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Palette, Image as ImageIcon, RotateCcw, Check, Sun, Moon } from 'lucide-react';

const PRESET_SWATCHES = [
  { name: 'Earthy Red (Default)', primary: '#8B3A3A', secondary: '#6F2C2C', accent: '#F3E4DE' },
  { name: 'Warm Rose', primary: '#BE123C', secondary: '#9F1239', accent: '#FFE4E6' },
  { name: 'Royal Gold', primary: '#D97706', secondary: '#B45309', accent: '#FEF3C7' },
  { name: 'Emerald Luxe', primary: '#059669', secondary: '#047857', accent: '#D1FAE5' },
];

export default function AdminSettingsPage() {
  const { settings, updateSettings, resetDefaults, toggleDarkMode } = useTheme();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { showSuccess } = useToast();

  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || '');
  const [secondaryColor, setSecondaryColor] = useState(settings.secondaryColor || '');
  const [accentColor, setAccentColor] = useState(settings.accentColor || '');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [featuredImageUrl, setFeaturedImageUrl] = useState(settings.featuredImageUrl || '');
  const [siteName, setSiteName] = useState(settings.siteName || '');
  const [tagline, setTagline] = useState(settings.tagline || '');

  // Theme settings are hydrated from storage after mount (and reset by resetDefaults);
  // keep the form in sync so saving never overwrites them with stale defaults.
  useEffect(() => {
    setPrimaryColor(settings.primaryColor || '');
    setSecondaryColor(settings.secondaryColor || '');
    setAccentColor(settings.accentColor || '');
    setLogoUrl(settings.logoUrl || '');
    setFeaturedImageUrl(settings.featuredImageUrl || '');
    setSiteName(settings.siteName || '');
    setTagline(settings.tagline || '');
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      primaryColor,
      secondaryColor,
      accentColor,
      logoUrl,
      featuredImageUrl,
      siteName,
      tagline,
    });
    showSuccess('Theme Updated', 'Branding customizations applied across the entire app.');
  };

  const handleApplyPreset = (swatch: typeof PRESET_SWATCHES[0]) => {
    setPrimaryColor(swatch.primary);
    setSecondaryColor(swatch.secondary);
    setAccentColor(swatch.accent);
    updateSettings({
      primaryColor: swatch.primary,
      secondaryColor: swatch.secondary,
      accentColor: swatch.accent,
    });
    showSuccess('Preset Applied', `Applied ${swatch.name} palette.`);
  };

  if (!isAuthLoading && !isAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 pt-16 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 flex items-center justify-center mx-auto border border-amber-200">
          <Palette className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-[var(--foreground)]">Administrator Access Required</h2>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          Store branding, theme customization, and salon settings are restricted to Salon Owners and Administrators.
        </p>
        <div className="pt-2">
          <Link
            href="/admin/dashboard"
            className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Theme & Branding Studio</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Customize colors, store logo, hero images, and brand identity in real-time.
          </p>
        </div>
        <button
          onClick={() => {
            resetDefaults();
            showSuccess('Defaults Restored', 'Reverted to default B Diamond theme.');
          }}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--border)] transition-colors flex items-center gap-1.5 self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Color Palette Section */}
        <div className="glass-card p-6 rounded-2xl border border-[var(--border)] space-y-4">
          <h2 className="text-sm font-black text-[var(--foreground)] flex items-center gap-2">
            <Palette className="w-4 h-4 text-[var(--primary)]" />
            Brand Color Palette
          </h2>

          {/* Preset Swatches */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[var(--muted-foreground)] block">Preset Swatches</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_SWATCHES.map((swatch) => (
                <button
                  key={swatch.name}
                  type="button"
                  onClick={() => handleApplyPreset(swatch)}
                  className="p-3 rounded-xl border border-[var(--border)] bg-[var(--muted)] hover:border-[var(--primary)] transition-all text-left space-y-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: swatch.primary }} />
                    <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: swatch.secondary }} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--foreground)] block">{swatch.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-[var(--border)] cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-mono font-bold text-[var(--foreground)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Secondary Accent</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-[var(--border)] cursor-pointer"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-mono font-bold text-[var(--foreground)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Call-to-Action Accent</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-[var(--border)] cursor-pointer"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-mono font-bold text-[var(--foreground)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Store Assets Section */}
        <div className="glass-card p-6 rounded-2xl border border-[var(--border)] space-y-4">
          <h2 className="text-sm font-black text-[var(--foreground)] flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[var(--primary)]" />
            Store Assets & Identity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Store Name</label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Tagline</label>
              <input
                type="text"
                required
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Store Logo URL</label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-mono text-[var(--foreground)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Featured Hero Photo URL</label>
              <input
                type="text"
                value={featuredImageUrl}
                onChange={(e) => setFeaturedImageUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-mono text-[var(--foreground)]"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-2">
          <button type="submit" className="btn-primary px-8 py-3 rounded-xl text-xs font-black shadow-md flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Save Theme Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
