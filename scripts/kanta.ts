/**
 * Pure helpers for build-pharmacies.ts: map Kanta code server items (Fimea pharmacy
 * register) to our records, and judge Digitransit geocoding results. No I/O here.
 */

/** One item from `conceptCodes` in the Kanta code server response. */
export type KantaItem = {
  conceptCodeId: string;
  /** "YYYY-MM-DD". In the future for a pharmacy that hasn't opened yet. */
  beginDate: string;
  /** "YYYY-MM-DD". Open-ended records use 2100-12-31; closed ones have a past date. */
  expirationDate: string;
  attributes: { attributeName: string; attributeValue: string[] }[];
};

export type KantaPage = {
  conceptCodes: KantaItem[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

export type PharmacyRecord = {
  /** Fimea OID, for example "1.2.246.553.1.52". */
  id: string;
  name: string;
  /** Visiting address. Falls back to the street part of the postal address. */
  address: string;
  postcode: string;
  city: string;
  phone?: string;
  /** Branch pharmacy (_sivuapteekki_), run under a main pharmacy's licence. */
  branch: boolean;
};

export type Pharmacy = PharmacyRecord & { lat: number; lon: number };

/**
 * Register types the public can walk into. The register also lists hospital pharmacies
 * ("Sairaala-apteekki") and medicine centres ("Lääkekeskus"), which serve hospitals only.
 */
const PUBLIC_TYPES = new Set(["Apteekki", "Sivuapteekki"]);

export function attr(item: KantaItem, name: string): string {
  const value = item.attributes.find((a) => a.attributeName === name)?.attributeValue[0];
  return value?.trim() ?? "";
}

/** Open today (begun and not expired) and serving the public. */
export function isOpenToPublic(item: KantaItem, today: string): boolean {
  return (
    item.beginDate <= today &&
    item.expirationDate >= today &&
    PUBLIC_TYPES.has(attr(item, "ApteekkiTyyppi"))
  );
}

/**
 * A hand-checked address for a register entry the geocoder can't place, keyed by id in
 * scripts/address-overrides.json. It's still geocoded by the same rules: we store the
 * address, never coordinates.
 */
export type AddressOverride = {
  name: string;
  /** The register's address when the override was written. */
  registerAddress: string;
  address: string;
  postcode: string;
  city: string;
  /** Where the address came from and when it was checked. */
  note: string;
};

/**
 * Apply an override only while the register still has the address it was written for. If
 * the register has changed, its new address wins and the caller should flag the override.
 */
export function applyOverride(
  rec: PharmacyRecord,
  override: AddressOverride | undefined,
): { rec: PharmacyRecord; stale: boolean } {
  if (!override) return { rec, stale: false };
  if (override.registerAddress !== rec.address) return { rec, stale: true };
  const { address, postcode, city } = override;
  return { rec: { ...rec, address, postcode, city }, stale: false };
}

export function toRecord(item: KantaItem): PharmacyRecord {
  // PostAddress is "street, postcode, office". StreetAddress (the visiting address) is missing
  // on a few records, so fall back to the postal street.
  const postalStreet = attr(item, "PostAddress").split(",")[0]?.trim() ?? "";
  const phone = attr(item, "PhoneNumber");
  const rec: PharmacyRecord = {
    id: item.conceptCodeId,
    // Abbreviation is the everyday name ("Helsingin Vuosaaren apteekki"); LongName is often
    // the licence's numbered name ("Helsingin 54. apteekki").
    name: attr(item, "Abbreviation") || attr(item, "LongName"),
    address: attr(item, "StreetAddress") || postalStreet,
    postcode: attr(item, "PostNumber"),
    city: attr(item, "PostOffice"),
    ...(phone && { phone }),
    branch: attr(item, "ApteekkiTyyppi") === "Sivuapteekki",
  };
  if (!rec.id || !rec.name) {
    throw new Error(`Unmapped item, run --inspect: ${JSON.stringify(item).slice(0, 300)}`);
  }
  return rec;
}

/**
 * Geocoder queries to try, in order. The register's post office is often a village
 * ("Söderkulla", "Vääksy") that the geocoder doesn't know, so the second try drops it and
 * relies on the postcode. Both answers are judged by the same rules.
 */
export function geocodeQueries(rec: PharmacyRecord): string[] {
  if (!rec.address) return [];
  return [`${rec.address}, ${rec.postcode} ${rec.city}`, `${rec.address}, ${rec.postcode}`];
}

/** Minimum Pelias confidence to accept a match without review. */
export const MIN_CONFIDENCE = 0.8;
/** Pelias layers precise enough to stand for a building. "street" is a road's midpoint. */
const PRECISE_LAYERS = new Set(["address", "venue"]);

/** Generous bounding box for Finland, including Åland. */
const FINLAND = { minLat: 59.4, maxLat: 70.2, minLon: 19.0, maxLon: 31.7 };

export type GeocodeFeature = {
  geometry: { coordinates: [number, number] };
  properties: { confidence?: number; layer?: string; label?: string };
};

/** Coordinates if the match is good enough, otherwise the reason it needs review. */
export function judgeMatch(
  feature: GeocodeFeature | undefined,
): { lat: number; lon: number } | string {
  if (!feature) return "no match";
  const { confidence = 0, layer = "?", label = "" } = feature.properties;
  if (confidence < MIN_CONFIDENCE) return `low confidence ${confidence} (${layer}: ${label})`;
  if (!PRECISE_LAYERS.has(layer)) return `imprecise match (${layer}: ${label})`;
  const [lon, lat] = feature.geometry.coordinates;
  const inFinland =
    lat >= FINLAND.minLat &&
    lat <= FINLAND.maxLat &&
    lon >= FINLAND.minLon &&
    lon <= FINLAND.maxLon;
  if (!inFinland) return `outside Finland ${lat},${lon} (${label})`;
  return { lat, lon };
}

/**
 * Coordinates from the previous build, if this record's geocoding input (address, postcode,
 * city, after any override) hasn't changed. Saves geocoding calls on a rebuild.
 */
export function previousLocation(
  rec: PharmacyRecord,
  previous: ReadonlyMap<string, Pharmacy>,
): { lat: number; lon: number } | undefined {
  const p = previous.get(rec.id);
  if (!p || p.address !== rec.address || p.postcode !== rec.postcode || p.city !== rec.city) {
    return undefined;
  }
  return { lat: p.lat, lon: p.lon };
}
