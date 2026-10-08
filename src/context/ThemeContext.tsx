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

const DEFAULT_THEME: ThemeSettings = {
  primaryColor: '#8B3A3A',
  secondaryColor: '#BE123C',
  accentColor: '#059669',
  logoUrl: '/bdiamond-logo.png',
  featuredImageUrl: '',
  siteName: 'B DIAMOND BARBERSHOP',
  tagline: 'Barbershop · Fredericton',
  currency: 'CAD $',
  darkMode: false,
};

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
        setSettings({ ...DEFAULT_THEME, ...parsed });
      } catch {
        /* fallback to defaults */
      }
    }
  }, []);

  // Apply CSS custom properties and Dark Mode on state change
  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty('--theme-primary', settings.primaryColor);
    root.style.setProperty('--theme-secondary', settings.secondaryColor);
    root.style.setProperty('--theme-accent', settings.accentColor);

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
