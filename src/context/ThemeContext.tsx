'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  featuredImageUrl: string;
  siteName: string;
  tagline: string;
  currency: string;
  darkMode: boolean;
}

// Empty colours mean "use the logo palette in globals.css" (gold on black in dark mode,
// deep gold on ivory in light mode). The owner can still pick custom colours in Settings.
const DEFAULT_THEME: ThemeSettings = {
  primaryColor: '',
  secondaryColor: '',
  accentColor: '',
  logoUrl: '/logo-mark.jpg',
  featuredImageUrl: '',
  siteName: 'B DIAMOND BARBERSHOP',
  tagline: 'Barbershop · Fredericton',
  currency: 'CAD $',
  darkMode: true,
};

// Values saved by earlier versions of the site that just meant "the default".
const OLD_DEFAULTS: Partial<Record<keyof ThemeSettings, string[]>> = {
  primaryColor: ['#8B3A3A'],
  secondaryColor: ['#BE123C', '#6F2C2C'],
  accentColor: ['#059669', '#F3E4DE'],
  logoUrl: ['/bdiamond-logo.png'],
};

function withoutOldDefaults(saved: Partial<ThemeSettings>): Partial<ThemeSettings> {
  const next: Partial<ThemeSettings> = { ...saved };
  for (const [key, olds] of Object.entries(OLD_DEFAULTS) as [keyof ThemeSettings, string[]][]) {
    const value = next[key];
    if (typeof value === 'string' && olds.some((o) => o.toLowerCase() === value.toLowerCase())) delete next[key];
  }
  return next;
}

interface ThemeContextType {
  settings: ThemeSettings;
  updateSettings: (newSettings: Partial<ThemeSettings>) => void;
  resetDefaults: () => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_THEME);

  // Load persisted theme settings
  useEffect(() => {
    const saved = localStorage.getItem('bdiamond_theme_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_THEME, ...withoutOldDefaults(parsed) });
      } catch {
        /* fallback to defaults */
      }
    }
  }, []);

  // Apply CSS custom properties and Dark Mode on state change
  useEffect(() => {
    const root = document.documentElement;

    const apply = (name: string, value: string) =>
      value ? root.style.setProperty(name, value) : root.style.removeProperty(name);
    apply('--theme-primary', settings.primaryColor);
    apply('--theme-secondary', settings.secondaryColor);
    apply('--theme-accent', settings.accentColor);

    if (settings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Dynamic Favicon sync
    if (typeof document !== 'undefined' && settings.logoUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.logoUrl;
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<ThemeSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('bdiamond_theme_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const resetDefaults = () => {
    setSettings(DEFAULT_THEME);
    localStorage.setItem('bdiamond_theme_settings', JSON.stringify(DEFAULT_THEME));
  };

  const toggleDarkMode = () => {
    updateSettings({ darkMode: !settings.darkMode });
  };

  return (
    <ThemeContext.Provider
      value={{ settings, updateSettings, resetDefaults, toggleDarkMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
