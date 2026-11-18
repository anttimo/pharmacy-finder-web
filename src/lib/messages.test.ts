import type { NearestState } from "../hooks/useNearestPharmacies";
import type { SuggestionsState } from "../hooks/usePlaceSuggestions";
import { fieldMessage, statusMessage } from "./messages";

// Keys instead of real texts, so the tests show which message was picked.
const i18n = {
  t: (key: string) => key,
  tn: (key: string, count: number) => `${key}:${count}`,
};

const kamppi = { label: "Kamppi, Helsinki", lat: 60.17, lon: 24.93 };
const idle: SuggestionsState = { status: "idle" };
const results: SuggestionsState = { status: "results", places: [kamppi], text: "kamp" };
const empty: SuggestionsState = { status: "empty", text: "kamp" };
const error: SuggestionsState = { status: "error", text: "kamp" };
const nearestIdle: NearestState = { status: "idle" };

describe("fieldMessage", () => {
  it("says nothing while all is well", () => {
    expect(fieldMessage(idle, false, false, i18n)).toBeNull();
    expect(fieldMessage(results, false, false, i18n)).toBeNull();
  });

  it("says when nothing matches, as an error only once the field is invalid", () => {
    expect(fieldMessage(empty, false, false, i18n)).toEqual({
      text: "search.noMatches",
      error: false,
    });
    expect(fieldMessage(empty, true, false, i18n)).toEqual({
      text: "search.noMatches",
      error: true,
    });
  });

  it("asks for more letters, or for a choice from the list, when invalid", () => {
    expect(fieldMessage(idle, true, true, i18n)?.text).toBe("search.tooShort");
    expect(fieldMessage(results, true, false, i18n)?.text).toBe("search.chooseFromList");
  });

  it("reports a search error", () => {
    expect(fieldMessage(error, false, false, i18n)).toEqual({ text: "search.error", error: true });
  });
});

describe("statusMessage", () => {
  it("repeats the field's message, hidden, so it is announced", () => {
    expect(statusMessage(nearestIdle, empty, { text: "x" }, false, i18n)).toEqual({
      text: "x",
      visible: false,
      about: "field",
    });
  });

  it("announces the suggestion count only while the list is open", () => {
    const open = statusMessage(nearestIdle, results, null, true, i18n);
    expect(open).toEqual({ text: "search.suggestions:1", visible: false, about: "suggestions" });
    expect(statusMessage(nearestIdle, results, null, false, i18n).text).toBe("");
  });

  it("shows the pharmacy search status when the field has nothing to say", () => {
    const found: NearestState = {
      status: "results",
      pharmacies: [],
      origin: { kind: "device" },
    };
    expect(statusMessage(found, idle, null, false, i18n)).toEqual({
      text: "status.found:0",
      visible: true,
      about: "pharmacies",
    });
    expect(statusMessage(nearestIdle, idle, null, false, i18n).visible).toBe(false);
  });

  it("tells a location error from a network error", () => {
    const status = (kind: "location" | "network") =>
      statusMessage({ status: "error", kind }, idle, null, false, i18n).text;
    expect(status("location")).toBe("status.locationError");
    expect(status("network")).toBe("status.networkError");
  });
});
