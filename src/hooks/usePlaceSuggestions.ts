import { useCallback, useEffect, useState } from "react";
import { geocode, type Place } from "../data/geocode";
import type { Locale } from "../i18n/translate";

/** Wait this long after the last keystroke before asking. */
export const DEBOUNCE_MS = 250;
/** Shorter text gets no suggestions: one letter matches too much to be useful. */
export const MIN_QUERY_LENGTH = 2;

export type SuggestionsState =
  | { status: "idle" }
  // The previous suggestions stay visible while new ones load, so the list doesn't flicker.
  | { status: "loading"; places: Place[] }
  | { status: "results"; places: Place[] }
  | { status: "empty" }
  | { status: "error" };

const IDLE: SuggestionsState = { status: "idle" };

/** The suggestions currently on screen. */
export function visiblePlaces(state: SuggestionsState): Place[] {
  return state.status === "loading" || state.status === "results" ? state.places : [];
}

/**
 * Place suggestions for what the user is typing. Debounced, and a newer query aborts the
 * request for an older one, so only the latest answer is shown. `retry()` asks again.
 */
export function usePlaceSuggestions(query: string, lang: Locale) {
  const [state, setState] = useState<SuggestionsState>(IDLE);
  const [attempt, setAttempt] = useState(0);
  const text = query.trim();

  useEffect(() => {
    if (text.length < MIN_QUERY_LENGTH) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState((previous) => ({ status: "loading", places: visiblePlaces(previous) }));
      try {
        const places = await geocode(text, lang, controller.signal);
        if (controller.signal.aborted) return;
        setState(places.length > 0 ? { status: "results", places } : { status: "empty" });
      } catch {
        if (controller.signal.aborted) return;
        setState({ status: "error" });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, lang, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  // Too short to search: idle, whatever the last answer was.
  const current: SuggestionsState = text.length < MIN_QUERY_LENGTH ? IDLE : state;
  return { state: current, retry };
}
