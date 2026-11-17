import { useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nContext, type I18n } from "./context";
import en from "./en";
import fi from "./fi";
import {
  LOCALES,
  detectLocale,
  translate,
  translatePlural,
  type Locale,
  type Messages,
} from "./translate";

const dictionaries: Record<Locale, Messages> = { fi, en };
const STORAGE_KEY = "locale";

function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (LOCALES as readonly string[]).includes(stored)) return stored as Locale;
  } catch {
    // Storage can be unavailable (private mode, blocked site data). Fall back to the browser.
  }
  return detectLocale(navigator.languages ?? [navigator.language]);
}

export function I18nProvider({
  children,
  locale: forcedLocale,
}: {
  children: ReactNode;
  /** Fixes the starting locale, mainly for tests. */
  locale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => forcedLocale ?? initialLocale());

  // index.html has the English title and lang as the fallback until this runs.
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(dictionaries[locale], locale, "app.title");
  }, [locale]);

  const value = useMemo<I18n>(() => {
    const messages = dictionaries[locale];
    return {
      locale,
      setLocale: (next) => {
        setLocaleState(next);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Not saved; the choice still applies for this visit.
        }
      },
      t: (key, vars) => translate(messages, locale, key, vars),
      tn: (key, count, vars) => translatePlural(messages, locale, key, count, vars),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
