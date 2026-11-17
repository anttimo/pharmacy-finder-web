import { useCallback, useEffect, useRef, useState } from "react";
import type { Place } from "../data/geocode";
import { loadPharmacies } from "../data/pharmacies";
import type { LatLon } from "../lib/geo";
import { nearest, type PharmacyWithDistance } from "../lib/pharmacy";

/** How many pharmacies to show. There's no distance limit: the nearest are shown however far. */
export const NEAREST_COUNT = 3;

/** Where the search started from: the device location, or a place the user chose. */
export type SearchOrigin = { kind: "device" } | { kind: "place"; label: string };

export type NearestState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "loading" }
  | { status: "results"; pharmacies: PharmacyWithDistance[]; origin: SearchOrigin }
  | { status: "denied" }
  | { status: "error"; kind: "location" | "network" };

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 60_000,
};

/**
 * Nearest pharmacies to the device location (`locate()`) or to a chosen place (`searchAt()`),
 * found on the device: the device location is never sent anywhere. Each call starts a new
 * search (also used to retry) and supersedes any search still running, so only the latest
 * result is shown.
 */
export function useNearestPharmacies() {
  const [state, setState] = useState<NearestState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  /** Supersedes the running search and returns the signal for the new one. */
  const startSearch = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    return controller.signal;
  }, []);

  /** Loads the list and shows the nearest to `point`, unless a newer search has started. */
  const showNearest = useCallback(
    async (point: LatLon, origin: SearchOrigin, signal: AbortSignal) => {
      // The list import can't be cancelled, so ignore answers to a superseded search.
      setState({ status: "loading" });
      try {
        const all = await loadPharmacies();
        if (signal.aborted) return;
        setState({ status: "results", pharmacies: nearest(all, point, NEAREST_COUNT), origin });
      } catch {
        if (signal.aborted) return;
        setState({ status: "error", kind: "network" });
      }
    },
    [],
  );

  const locate = useCallback(() => {
    const signal = startSearch();

    if (!("geolocation" in navigator)) {
      setState({ status: "error", kind: "location" });
      return;
    }

    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Geolocation can't be cancelled either.
        if (signal.aborted) return;
        const point = { lat: position.coords.latitude, lon: position.coords.longitude };
        void showNearest(point, { kind: "device" }, signal);
      },
      (error) => {
        if (signal.aborted) return;
        setState(
          error.code === error.PERMISSION_DENIED
            ? { status: "denied" }
            : { status: "error", kind: "location" },
        );
      },
      GEOLOCATION_OPTIONS,
    );
  }, [startSearch, showNearest]);

  const searchAt = useCallback(
    (place: Place) => {
      const signal = startSearch();
      void showNearest(place, { kind: "place", label: place.label }, signal);
    },
    [startSearch, showNearest],
  );

  return { state, locate, searchAt };
}
