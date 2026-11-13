import { useCallback, useEffect, useReducer, useRef } from "react";
import { findNearestPharmacies } from "../data/overpass";
import type { PharmacyWithDistance } from "../lib/pharmacy";

export type NearestState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "loading" }
  | { status: "results"; pharmacies: PharmacyWithDistance[]; radiusMeters: number }
  | { status: "empty"; radiusMeters: number }
  | { status: "denied" }
  | { status: "error"; kind: "location" | "network" };

// Each state is set as a whole, so the reducer just replaces it.
const reducer = (_state: NearestState, next: NearestState): NearestState => next;

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 60_000,
};

/**
 * Device location → nearest pharmacies. `locate()` starts a new search (also used to
 * retry) and cancels any search still running, so only the latest result is shown.
 */
export function useNearestPharmacies() {
  const [state, dispatch] = useReducer(reducer, { status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const locate = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;

    if (!("geolocation" in navigator)) {
      dispatch({ status: "error", kind: "location" });
      return;
    }

    dispatch({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // Geolocation can't be cancelled, so ignore answers to a superseded request.
        if (signal.aborted) return;
        dispatch({ status: "loading" });
        try {
          const origin = { lat: position.coords.latitude, lon: position.coords.longitude };
          const { pharmacies, radiusMeters } = await findNearestPharmacies(origin, signal);
          if (signal.aborted) return;
          dispatch(
            pharmacies.length > 0
              ? { status: "results", pharmacies, radiusMeters }
              : { status: "empty", radiusMeters },
          );
        } catch {
          if (signal.aborted) return;
          dispatch({ status: "error", kind: "network" });
        }
      },
      (error) => {
        if (signal.aborted) return;
        dispatch(
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
