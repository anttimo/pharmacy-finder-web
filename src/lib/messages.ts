import type { NearestState } from "../hooks/useNearestPharmacies";
import type { SuggestionsState } from "../hooks/usePlaceSuggestions";
import type { I18n } from "../i18n/context";

type Translate = Pick<I18n, "t" | "tn">;

export type FieldMessage = { text: string; error: boolean };

export type StatusMessage = {
  text: string;
  visible: boolean;
  about: "field" | "suggestions" | "pharmacies";
};

/** What the search field says about itself, shown under it: see PlaceSearch `message`. */
export function fieldMessage(
  suggestions: SuggestionsState,
  invalid: boolean,
  tooShort: boolean,
  { t }: Translate,
): FieldMessage | null {
  if (invalid) {
    // When the search itself failed there were no suggestions to choose from: keep saying so.
    const key = tooShort
      ? "search.tooShort"
      : suggestions.status === "empty"
        ? "search.noMatches"
        : suggestions.status === "error"
          ? "search.error"
          : "search.chooseFromList";
    return { text: t(key), error: true };
  }
  if (suggestions.status === "empty") return { text: t("search.noMatches"), error: false };
  if (suggestions.status === "error") return { text: t("search.error"), error: true };
  return null;
}

/** The status line under the search, which is also the page's one live region. */
export function statusMessage(
  state: NearestState,
  suggestions: SuggestionsState,
  field: { text: string } | null,
  listOpen: boolean,
  i18n: Translate,
): StatusMessage {
  if (field) return { text: field.text, visible: false, about: "field" };
  if (suggestions.status !== "idle") return suggestionsStatus(suggestions, listOpen, i18n);
  return pharmacyStatus(state, i18n);
}

function suggestionsStatus(
  suggestions: SuggestionsState,
  listOpen: boolean,
  { tn }: Translate,
): StatusMessage {
  // Only while the list can be reached: not after Escape or once the user has left.
  const text =
    suggestions.status === "results" && listOpen
      ? tn("search.suggestions", suggestions.places.length)
      : "";
  return { text, visible: false, about: "suggestions" };
}

function pharmacyStatus(state: NearestState, { t, tn }: Translate): StatusMessage {
  const about = "pharmacies";
  switch (state.status) {
    case "idle":
      return { text: "", visible: false, about };
    case "locating":
      return { text: t("status.locating"), visible: true, about };
    case "loading":
      return { text: t("status.loading"), visible: true, about };
    case "results":
      return { text: tn("status.found", state.pharmacies.length), visible: true, about };
    case "denied":
      return { text: t("status.denied"), visible: true, about };
    case "error":
      return {
        text: t(state.kind === "location" ? "status.locationError" : "status.networkError"),
        visible: true,
        about,
      };
  }
}
