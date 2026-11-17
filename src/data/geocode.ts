import type { Locale } from "../i18n/translate";
import type { LatLon } from "../lib/geo";

/** A place suggestion from address search. */
export interface Place extends LatLon {
  /** Display name, e.g. "Nihtisilta, Espoo". */
  label: string;
}

/** Longest search text the proxy accepts (ADR 0003). */
export const MAX_SEARCH_LENGTH = 100;

/**
 * Place suggestions for `text`, through our own /api/geocode Worker (ADR 0003), which holds
 * the Digitransit key. Sends no location: the device location never leaves the device.
 * Rejects on a network failure, a non-2xx answer or an unexpected body.
 */
export async function geocode(text: string, lang: Locale, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ text: text.slice(0, MAX_SEARCH_LENGTH), lang });
  const response = await fetch(`/api/geocode?${params}`, { signal });
  if (!response.ok) throw new Error(`Geocoding failed with ${response.status}`);
  const body = (await response.json()) as { results?: unknown };
  if (!Array.isArray(body.results)) throw new Error("Unexpected geocoding response");
  return body.results as Place[];
}
