'use client';

// English / Arabic for the shop manager (admin pages only; the customer side stays English).
// Text is written in English in the code and wrapped in t('…'); the Arabic for each English
// phrase lives in src/lib/i18n/ar.ts. A phrase with no Arabic yet shows in English.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AR } from '@/lib/i18n/ar';

export type Lang = 'en' | 'ar';
type Vars = Record<string, string | number>;

interface LanguageContextType {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (lang: Lang) => void;
  t: (text: string, vars?: Vars) => string;
}

const STORAGE_KEY = 'am_admin_lang';

function fill(text: string, vars?: Vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

const fallback: LanguageContextType = {
  lang: 'en',
  dir: 'ltr',
  setLang: () => {},
  t: (text, vars) => fill(text, vars),
};

const LanguageContext = createContext<LanguageContextType>(fallback);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'ar') setLangState('ar');
    } catch {
      /* private mode: stay in English */
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* not saved; still switches for this visit */
    }
  }, []);

  const t = useCallback(
    (text: string, vars?: Vars) => fill(lang === 'ar' ? AR[text] ?? text : text, vars),
    [lang]
  );

  const value = useMemo<LanguageContextType>(
    () => ({ lang, dir: lang === 'ar' ? 'rtl' : 'ltr', setLang, t }),
    [lang, setLang, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** Outside the admin pages this returns English, unchanged. */
export function useT() {
  return useContext(LanguageContext);
}

/** Money as "$1,234.56" in both languages (Canadian forms write it this way in Arabic too). */
const moneyFormat = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', currencyDisplay: 'narrowSymbol' });

export function useMoney() {
  return useCallback((value: unknown) => {
    const n = Number(value) || 0;
    // An invisible left-to-right mark keeps "-$5.00" together inside Arabic text.
    return `\u200E${moneyFormat.format(n)}`;
  }, []);
}
