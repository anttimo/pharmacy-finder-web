import { haversineMeters, type LatLon } from "./geo";

export interface Pharmacy extends LatLon {
  /** OSM type and id, e.g. "node/123". */
  id: string;
  name?: string;
  address?: string;
  /** Raw OSM `opening_hours` text. Shown as is, never interpreted. */
  openingHours?: string;
}

export interface PharmacyWithDistance extends Pharmacy {
  distanceMeters: number;
}

interface OverpassElement {
  type?: unknown;
  id?: unknown;
  lat?: unknown;
  lon?: unknown;
  center?: { lat?: unknown; lon?: unknown };
  tags?: Record<string, unknown>;
}

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const tag = (tags: Record<string, unknown>, key: string): string | undefined => {
  const value = tags[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
};

/** "Street 5, 00100 City" from whichever `addr:*` parts exist. */
function formatAddress(tags: Record<string, unknown>): string | undefined {
  const street = [tag(tags, "addr:street"), tag(tags, "addr:housenumber")]
    .filter(Boolean)
    .join(" ");
  const place = [tag(tags, "addr:postcode"), tag(tags, "addr:city")].filter(Boolean).join(" ");
  return [street, place].filter(Boolean).join(", ") || undefined;
}

/**
 * Turns an Overpass `out center tags` response into pharmacies. Nodes carry lat/lon,
 * ways and relations carry `center`. Elements without coordinates are skipped and
 * duplicates (same type and id) are dropped.
 */
export function parseOverpass(json: unknown): Pharmacy[] {
  const elements = (json as { elements?: unknown })?.elements;
  if (!Array.isArray(elements)) return [];

  const byId = new Map<string, Pharmacy>();
  for (const raw of elements as OverpassElement[]) {
    if (typeof raw?.type !== "string" || !isNumber(raw.id)) continue;
    const lat = isNumber(raw.lat) ? raw.lat : raw.center?.lat;
    const lon = isNumber(raw.lon) ? raw.lon : raw.center?.lon;
    if (!isNumber(lat) || !isNumber(lon)) continue;

    const id = `${raw.type}/${raw.id}`;
    if (byId.has(id)) continue;
    const tags = raw.tags ?? {};
    byId.set(id, {
      id,
      lat,
      lon,
      name: tag(tags, "name"),
      address: formatAddress(tags),
      openingHours: tag(tags, "opening_hours"),
    });
  }
  return [...byId.values()];
}

/** Adds straight-line distance from `origin` and sorts nearest first. */
export function sortByDistance(pharmacies: Pharmacy[], origin: LatLon): PharmacyWithDistance[] {
  return pharmacies
    .map((p) => ({ ...p, distanceMeters: haversineMeters(origin, p) }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
