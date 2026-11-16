import type { Pharmacy } from "../lib/pharmacy";

/**
 * The pharmacy list (ADR 0001). A dynamic import, so Vite puts the JSON in its own file and
 * the browser fetches it on the first search, not on page load. Rejects if that fetch fails.
 */
export async function loadPharmacies(): Promise<Pharmacy[]> {
  const { default: data } = await import("./pharmacies.json");
  return data.pharmacies satisfies Pharmacy[];
}
