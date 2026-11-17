import type { Locale } from "../i18n/translate";
import type { LatLon } from "../lib/geo";

/** A place suggestion from address search. */
export interface Place extends LatLon {
  /** Display name, e.g. "Nihtisilta, Espoo". */
  label: string;
}

/** Longest search text the proxy accepts (ADR 0003). */
export const MAX_SEARCH_LENGTH = 100;
/** Longest query string the proxy accepts, URL-encoded (ADR 0003). */
const MAX_QUERY_LENGTH = 256;

/**
 * The query string for `text`, cut to fit the proxy's limits. Letters such as "ä" take six
 * characters once encoded, so 100 of them can be too long; the end of the text goes first.
 */
function searchParams(text: string, lang: Locale): string {
  const chars = Array.from(text.slice(0, MAX_SEARCH_LENGTH));
  let query = new URLSearchParams({ text: chars.join(""), lang }).toString();
  while (query.length > MAX_QUERY_LENGTH) {
    chars.pop();
    query = new URLSearchParams({ text: chars.join(""), lang }).toString();
  }
  return query;
}

/**
 * Place suggestions for `text`, through our own /api/geocode Worker (ADR 0003), which holds
 * the Digitransit key. Sends no location: the device location never leaves the device.
 * Rejects on a network failure, a non-2xx answer or an unexpected body.
 */
export async function geocode(text: string, lang: Locale, signal?: AbortSignal): Promise<Place[]> {
  const response = await fetch(`/api/geocode?${searchParams(text, lang)}`, { signal });
  if (!response.ok) throw new Error(`Geocoding failed with ${response.status}`);
  const body = (await response.json()) as { results?: unknown };
  if (!Array.isArray(body.results)) throw new Error("Unexpected geocoding response");
  return body.results as Place[];
}
