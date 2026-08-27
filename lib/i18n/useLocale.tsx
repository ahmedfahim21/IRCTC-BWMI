"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { STRINGS, type StringKey } from "./strings";

export const LOCALES = {
  en: { label: "English" },
  hi: { label: "हिन्दी" },
} as const;

export type Locale = keyof typeof LOCALES;

interface LocaleContext {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: StringKey) => string;
}

const Context = createContext<LocaleContext | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem("irctc.locale") as Locale | null;
    if (stored && stored in LOCALES) setLocaleState(stored);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem("irctc.locale", next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback((key: StringKey) => STRINGS[locale][key] ?? STRINGS.en[key] ?? key, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLocale(): LocaleContext {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}
