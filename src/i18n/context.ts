import { createContext, useContext } from "react";
import type { Locale, MessageKey, PluralKey, Vars } from "./translate";

export interface I18n {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Vars) => string;
  tn: (key: PluralKey, count: number, vars?: Vars) => string;
}

export const I18nContext = createContext<I18n | null>(null);

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
