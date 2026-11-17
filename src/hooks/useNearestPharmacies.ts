import { useCallback, useEffect, useRef, useState } from "react";
import { loadPharmacies } from "../data/pharmacies";
import { nearest, type PharmacyWithDistance } from "../lib/pharmacy";

/** How many pharmacies to show. There's no distance limit: the nearest are shown however far. */
export const NEAREST_COUNT = 3;

export type NearestState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "loading" }
  | { status: "results"; pharmacies: PharmacyWithDistance[] }
  | { status: "denied" }
  | { status: "error"; kind: "location" | "network" };

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 60_000,
};

/**
 * Device location → nearest pharmacies, found on the device: the location is never sent
 * anywhere. `locate()` starts a new search (also used to retry) and supersedes any search
 * still running, so only the latest result is shown.
 */
export function useNearestPharmacies() {
  const [state, setState] = useState<NearestState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const locate = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;

    if (!("geolocation" in navigator)) {
      setState({ status: "error", kind: "location" });
      return;
    }

    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // Neither geolocation nor the list import can be cancelled, so ignore answers to a
        // superseded search.
        if (signal.aborted) return;
        setState({ status: "loading" });
        try {
          const all = await loadPharmacies();
          if (signal.aborted) return;
          const origin = { lat: position.coords.latitude, lon: position.coords.longitude };
          setState({ status: "results", pharmacies: nearest(all, origin, NEAREST_COUNT) });
        } catch {
          if (signal.aborted) return;
          setState({ status: "error", kind: "network" });
        }
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
  }, []);

  return { state, locate };
}
