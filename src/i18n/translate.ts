import en from "./en";

export const LOCALES = ["fi", "en"] as const;
export type Locale = (typeof LOCALES)[number];

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
/** Dictionary shape every locale must match. */
export type Messages = Widen<typeof en>;

type Plural = { one: string; other: string };

/** Dot paths to plain strings, e.g. "results.heading". */
export type MessageKey = Paths<Messages>;
type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends Plural
      ? never
      : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Dot paths to plural groups, e.g. "status.found". */
export type PluralKey = PluralPaths<Messages>;
type PluralPaths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? never
    : T[K] extends Plural
      ? `${P}${K}`
      : PluralPaths<T[K], `${P}${K}.`>;
}[keyof T & string];

export type Vars = Record<string, string | number>;

/** BCP 47 tag for Intl. English uses British spelling ("kilometres"). */
export function intlLocale(locale: Locale): string {
  return { fi: "fi-FI", en: "en-GB" }[locale];
}

/** First supported language in the browser's preference list, otherwise English. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const primary = tag.toLowerCase().split("-")[0];
    if ((LOCALES as readonly string[]).includes(primary)) return primary as Locale;
  }
  return "en";
}

function lookup(messages: Messages, path: string): unknown {
  let node: unknown = messages;
  for (const part of path.split(".")) {
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function interpolate(template: string, locale: Locale, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    if (value === undefined) return match;
    return typeof value === "number"
      ? new Intl.NumberFormat(intlLocale(locale)).format(value)
      : value;
  });
}

export function translate(
  messages: Messages,
  locale: Locale,
  key: MessageKey,
  vars?: Vars,
): string {
  return interpolate(lookup(messages, key) as string, locale, vars);
}

/** Picks the plural form for `count` and also passes it in as `{count}`. */
export function translatePlural(
  messages: Messages,
  locale: Locale,
  key: PluralKey,
  count: number,
  vars?: Vars,
): string {
  const group = lookup(messages, key) as Plural;
  const category = new Intl.PluralRules(intlLocale(locale)).select(count);
  const template = category === "one" ? group.one : group.other;
  return interpolate(template, locale, { ...vars, count });
}
