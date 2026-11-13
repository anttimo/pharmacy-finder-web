import { roundCoord, type LatLon } from "../lib/geo";
import {
  parseOverpass,
  sortByDistance,
  type Pharmacy,
  type PharmacyWithDistance,
} from "../lib/pharmacy";

// Primary public instance, then one fallback (ADR 0001).
export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
] as const;

/** Search radii, widened in order until something is found (ADR 0001). */
export const RADII_METERS = [2_000, 10_000, 50_000] as const;

// The query itself asks the server to stop after 15 s; allow a little more for the transfer.
const REQUEST_TIMEOUT_MS = 20_000;

export class OverpassError extends Error {
  /** Whether trying the fallback endpoint could help. */
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "OverpassError";
    this.retryable = retryable;
  }
}

/** The ADR 0001 query, with the centre rounded to about 100 m. */
export function buildQuery(center: LatLon, radiusMeters: number): string {
  const around = `around:${radiusMeters},${roundCoord(center.lat)},${roundCoord(center.lon)}`;
  return [
    "[out:json][timeout:15];",
    "(",
    `  nwr["amenity"="pharmacy"](${around});`,
    `  nwr["healthcare"="pharmacy"](${around});`,
    ");",
    "out center tags;",
  ].join("\n");
}

async function postQuery(endpoint: string, query: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: "POST",
    body: new URLSearchParams({ data: query }),
    signal,
  });
  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    throw new OverpassError(`Overpass responded with ${response.status}`, retryable);
  }
  const json: unknown = await response.json();
  // A server-side timeout still answers 200, with a "runtime error" remark and partial data.
  const remark = (json as { remark?: unknown })?.remark;
  if (typeof remark === "string" && remark.includes("runtime error")) {
    throw new OverpassError(`Overpass query failed: ${remark}`, true);
  }
  return json;
}

/** Pharmacies within `radiusMeters`, trying the fallback endpoint on a server or network error. */
export async function fetchPharmacies(
  center: LatLon,
  radiusMeters: number,
  signal: AbortSignal,
): Promise<Pharmacy[]> {
  const query = buildQuery(center, radiusMeters);
  let lastError: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);
      return parseOverpass(await postQuery(endpoint, query, requestSignal));
    } catch (error) {
      if (signal.aborted) throw error; // Cancelled by the caller: don't try further.
      if (error instanceof OverpassError && !error.retryable) throw error;
      lastError = error; // Network error, timeout, 429 or 5xx.
    }
  }
  throw lastError;
}

export interface NearestResult {
  /** Nearest first. Empty if nothing was found within the widest radius. */
  pharmacies: PharmacyWithDistance[];
  radiusMeters: number;
}

/**
 * Searches outward through RADII_METERS and returns the first non-empty result,
 * sorted by straight-line distance from the exact (unrounded) origin.
 */
export async function findNearestPharmacies(
  origin: LatLon,
  signal: AbortSignal,
): Promise<NearestResult> {
  for (const radiusMeters of RADII_METERS) {
    const found = await fetchPharmacies(origin, radiusMeters, signal);
    if (found.length > 0) {
      return { pharmacies: sortByDistance(found, origin), radiusMeters };
    }
  }
  return { pharmacies: [], radiusMeters: RADII_METERS[RADII_METERS.length - 1] };
}
