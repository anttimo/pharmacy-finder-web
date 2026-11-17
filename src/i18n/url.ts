import { LOCALES, type Locale } from "./translate";

/** Query parameter that picks the language, e.g. `?lang=fi`. The language links use it. */
const PARAM = "lang";

/** The language in a URL's query string, if it names a supported one. */
export function localeFromUrl(href: string): Locale | undefined {
  const value = new URL(href).searchParams.get(PARAM);
  return (LOCALES as readonly string[]).includes(value ?? "") ? (value as Locale) : undefined;
}

/** The same URL with its language set to `locale`, keeping other parameters and the hash. */
export function urlWithLocale(href: string, locale: Locale): string {
  const url = new URL(href);
  url.searchParams.set(PARAM, locale);
  return url.toString();
}
