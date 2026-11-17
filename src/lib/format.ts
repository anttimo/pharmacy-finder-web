import { intlLocale, type Locale } from "../i18n/translate";

/**
 * Distance with the unit spelled out ("350 metres", "1,2 kilometriä") so it reads
 * naturally in screen readers. Metres under 1 km, rounded to 10 m; kilometres above,
 * with one decimal under 10 km.
 */
export function formatDistance(meters: number, locale: Locale): string {
  const tag = intlLocale(locale);
  const roundedMeters = Math.round(meters / 10) * 10;
  if (roundedMeters < 1000) {
    return new Intl.NumberFormat(tag, {
      style: "unit",
      unit: "meter",
      unitDisplay: "long",
    }).format(roundedMeters);
  }
  const km = meters / 1000;
  return new Intl.NumberFormat(tag, {
    style: "unit",
    unit: "kilometer",
    unitDisplay: "long",
    maximumFractionDigits: km < 10 ? 1 : 0,
  }).format(km);
}

/**
 * The calendar date of an ISO timestamp ("16 November 2026", "16. marraskuuta 2026"),
 * in Finnish time so it doesn't depend on the viewer's time zone.
 */
export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "long",
    timeZone: "Europe/Helsinki",
  }).format(new Date(iso));
}

/**
 * A `tel:` link for a Finnish phone number as the register writes it ("(09) 849 2370",
 * "010 5824430"): digits only, with the leading 0 replaced by the +358 country code.
 */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits.startsWith("0") ? `+358${digits.slice(1)}` : digits}`;
}
