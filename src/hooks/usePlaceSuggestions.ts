import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
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
  // `text` is the query an answer is for, so answers for older text can be told apart.
  | { status: "results"; places: Place[]; text: string }
  | { status: "empty"; text: string }
  | { status: "error"; text: string };

const IDLE: SuggestionsState = { status: "idle" };
const ignore = () => {};

/** The suggestions currently on screen. */
export function visiblePlaces(state: SuggestionsState): Place[] {
  return state.status === "loading" || state.status === "results" ? state.places : [];
}

/**
 * The state for `text`. An answer for older text counts as still loading (keeping its places
 * on screen), so "no matches" for the old text can't mark the new text invalid.
 */
function stateFor(state: SuggestionsState, text: string): SuggestionsState {
  if (text.length < MIN_QUERY_LENGTH) return IDLE; // too short to search, whatever came before
  if ("text" in state && state.text !== text) {
    return { status: "loading", places: visiblePlaces(state) };
  }
  return state;
}

/**
 * Place suggestions for what the user is typing. Debounced, and a newer query aborts the
 * request for an older one, so only the latest answer is shown. `retry()` asks again.
 * `chooseTop()` passes the top suggestion for the current text to `onChoose`, waiting for
 * the answer if it hasn't arrived yet (Enter pressed right after typing).
 */
export function usePlaceSuggestions(
  query: string,
  lang: Locale,
  onChoose: (place: Place) => void = ignore,
) {
  const [state, setState] = useState<SuggestionsState>(IDLE);
  const [attempt, setAttempt] = useState(0);
  const pendingRef = useRef(false);
  const text = query.trim();
  const chooseLater = useEffectEvent((place: Place) => onChoose(place));

  useEffect(() => {
    pendingRef.current = false; // a wait for the top suggestion belonged to the old text

    if (text.length < MIN_QUERY_LENGTH) return;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setState((previous) => ({ status: "loading", places: visiblePlaces(previous) }));
      try {
        const places = await geocode(text, lang, controller.signal);
        if (controller.signal.aborted) return;

        setState(
          places.length > 0 ? { status: "results", places, text } : { status: "empty", text },
        );
        if (pendingRef.current && places.length > 0) chooseLater(places[0]!);
      } catch {
        if (controller.signal.aborted) return;
        setState({ status: "error", text });
      }
      pendingRef.current = false;
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, lang, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const current = stateFor(state, text);

  const chooseTop = useCallback(() => {
    if (current.status === "results") onChoose(current.places[0]!);
    else if (text.length >= MIN_QUERY_LENGTH) pendingRef.current = true;
  }, [current, text, onChoose]);

  /** Forgets an Enter still waiting for its answer, e.g. when the user leaves the field. */
  const cancelPending = useCallback(() => {
    pendingRef.current = false;
  }, []);

  return { state: current, retry, chooseTop, cancelPending };
}
