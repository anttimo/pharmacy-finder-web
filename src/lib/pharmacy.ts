import { haversineMeters, type LatLon } from "./geo";

/** One pharmacy from src/data/pharmacies.json, built by `npm run build:pharmacies` (ADR 0001). */
export interface Pharmacy extends LatLon {
  /** Fimea register id, e.g. "1.2.246.553.1.52". */
  id: string;
  name: string;
  address: string;
  postcode: string;
  city: string;
  phone?: string;
  /** Branch pharmacy (sivuapteekki). */
  branch: boolean;
}

export interface PharmacyWithDistance extends Pharmacy {
  distanceMeters: number;
}

/** The `count` pharmacies nearest to `origin` by straight-line distance, nearest first. */
export function nearest(
  pharmacies: Pharmacy[],
  origin: LatLon,
  count: number,
): PharmacyWithDistance[] {
  return pharmacies
    .map((p) => ({ ...p, distanceMeters: haversineMeters(origin, p) }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, count);
}
