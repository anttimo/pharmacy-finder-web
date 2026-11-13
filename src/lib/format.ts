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
