import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { PlaceSearch } from "./components/PlaceSearch";
import { ResultsList } from "./components/ResultsList";
import type { Place } from "./data/geocode";
import { useNearestPharmacies, type NearestState } from "./hooks/useNearestPharmacies";
import {
  MIN_QUERY_LENGTH,
  usePlaceSuggestions,
  type SuggestionsState,
} from "./hooks/usePlaceSuggestions";
import { pharmaciesGeneratedAt } from "./data/pharmaciesGeneratedAt";
import { useI18n, type I18n } from "./i18n/context";
import { formatDate } from "./lib/format";

const CODE_SERVER_URL = "https://koodistopalvelu.kanta.fi/";

const linkClass =
  "rounded-sm text-blue-700 underline hover:text-blue-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

const buttonClass =
  "min-h-11 rounded bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

/** What the search field says about itself, shown under it: see PlaceSearch `message`. */
function fieldMessage(
  suggestions: SuggestionsState,
  invalid: boolean,
  tooShort: boolean,
  { t }: I18n,
): { text: string; error: boolean } | null {
  if (invalid) {
    const key = tooShort
      ? "search.tooShort"
      : suggestions.status === "empty"
        ? "search.noMatches"
        : "search.chooseFromList";
    return { text: t(key), error: true };
  }
  if (suggestions.status === "empty") return { text: t("search.noMatches"), error: false };
  if (suggestions.status === "error") return { text: t("search.error"), error: true };
  return null;
}

type StatusMessage = {
  text: string;
  visible: boolean;
  about: "field" | "suggestions" | "pharmacies";
};

/** The status line under the search. */
function statusMessage(
  state: NearestState,
  suggestions: SuggestionsState,
  field: { text: string } | null,
  listOpen: boolean,
  i18n: I18n,
): StatusMessage {
  if (field) return { text: field.text, visible: false, about: "field" };
  if (suggestions.status !== "idle") return suggestionsStatus(suggestions, listOpen, i18n);
  return pharmacyStatus(state, i18n);
}

function suggestionsStatus(
  suggestions: SuggestionsState,
  listOpen: boolean,
  { tn }: I18n,
): StatusMessage {
  // Only while the list can be reached: not after Escape or once the user has left.
  const text =
    suggestions.status === "results" && listOpen
      ? tn("search.suggestions", suggestions.places.length)
      : "";
  return { text, visible: false, about: "suggestions" };
}

function pharmacyStatus(state: NearestState, { t, tn }: I18n): StatusMessage {
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

/** Puts an element where `{name}` is in a translated text, keeping the word order of the language. */
function withElement(text: string, name: string, element: ReactNode): ReactNode {
  const [before, after = ""] = text.split(`{${name}}`);
  return (
    <>
      {before}
      {element}
      {after}
    </>
  );
}

type LastSearch = { kind: "device" } | { kind: "place"; place: Place };

function App() {
  const i18n = useI18n();
  const { t, locale } = i18n;
  const { state, locate, searchAt, clear } = useNearestPharmacies();

  // The field's text, and the label of the place chosen from it. While they match, the
  // field shows a chosen place and there's nothing to suggest.
  const [text, setText] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const query = text === chosen ? "" : text;
  // Some text, but too little to get suggestions for.
  const tooShort = query.trim() !== "" && query.trim().length < MIN_QUERY_LENGTH;
  // Left (or submitted) with text that isn't a found place. Cleared by typing or refocusing.
  const [invalid, setInvalid] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const lastSearchRef = useRef<LastSearch>({ kind: "device" });
  const locateButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

  // The button stays active during a search: tapping it again starts over. That's the way out
  // if the browser never answers, for example when its permission prompt is dismissed.
  const onLocate = () => {
    lastSearchRef.current = { kind: "device" };
    setText("");
    setChosen(null);
    setInvalid(false);
    locate();
  };

  const onChoose = (place: Place) => {
    lastSearchRef.current = { kind: "place", place };
    setText(place.label);
    setChosen(place.label);
    setInvalid(false);
    searchAt(place);
  };
  const suggestions = usePlaceSuggestions(query, locale, onChoose);

  // Retry buttons disappear once the search restarts, so move focus to where it started.
  const onRetry = () => {
    const last = lastSearchRef.current;
    if (last.kind === "place") {
      inputRef.current?.focus();
      searchAt(last.place);
    } else {
      locateButtonRef.current?.focus();
      locate();
    }
  };

  const onRetrySuggestions = () => {
    inputRef.current?.focus();
    suggestions.retry();
  };

  // The field and the results must agree: when the text isn't a place that was found, say so
  // and drop the results, rather than leave a list for some other place on screen.
  const markInvalid = () => {
    setInvalid(true);
    clear();
  };
  const onLeave = () => {
    // The user has moved on: an Enter still waiting for suggestions mustn't choose a place
    // (and move focus) later.
    suggestions.cancelPending();
    if (text.trim() !== "" && text !== chosen) markInvalid();
  };
  const onSubmitTop = () => {
    if (tooShort || suggestions.state.status === "empty") markInvalid();
    else suggestions.chooseTop();
  };

  // Make new results hard to miss: move focus to their heading (which scrolls them into
  // view, closes a phone keyboard and has screen readers read the heading) and briefly
  // highlight them. Not while the user is typing a new search, though.
  const revealResults = useEffectEvent(() => {
    const input = inputRef.current;
    if (input && document.activeElement === input && input.value !== chosen) return;
    const heading = resultsHeadingRef.current;
    heading?.focus();
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) {
      heading
        ?.closest("section")
        ?.animate?.([{ backgroundColor: "#dbeafe" }, { backgroundColor: "transparent" }], {
          duration: 1500,
          easing: "ease-out",
        });
    }
  });
  useEffect(() => {
    if (state.status === "results") revealResults();
  }, [state]);

  const field = fieldMessage(suggestions.state, invalid, tooShort, i18n);
  const status = statusMessage(state, suggestions.state, field, listOpen, i18n);
  const showsPharmacyStatus = status.about === "pharmacies";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-4 p-4">
        <h1 className="text-2xl font-semibold">{t("app.title")}</h1>
        <LanguageSwitcher />
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-8">
        <p>{t("app.intro")}</p>

        <button
          ref={locateButtonRef}
          type="button"
          onClick={onLocate}
          className={`mt-4 w-full sm:w-auto ${buttonClass}`}
        >
          {t("locate.button")}
        </button>
        <p className="mt-2 text-sm text-slate-700">{t("locate.privacy")}</p>

        <div className="my-5 flex items-center gap-3 text-slate-700">
          <span aria-hidden="true" className="h-px flex-1 bg-slate-300" />
          {t("search.or")}
          <span aria-hidden="true" className="h-px flex-1 bg-slate-300" />
        </div>

        <PlaceSearch
          text={text}
          onTextChange={(value) => {
            setText(value);
            setInvalid(false);
          }}
          suggestions={suggestions.state}
          onChoose={onChoose}
          onChooseTop={onSubmitTop}
          onLeave={onLeave}
          onFocus={() => setInvalid(false)}
          invalid={invalid}
          message={
            field && {
              ...field,
              action: suggestions.state.status === "error" && (
                <button
                  type="button"
                  onClick={onRetrySuggestions}
                  className={`mt-2 ${buttonClass}`}
                >
                  {t("error.retry")}
                </button>
              ),
            }
          }
          onListOpenChange={setListOpen}
          inputRef={inputRef}
        />

        <p role="status" className={status.visible ? "mt-4 font-medium" : "sr-only"}>
          {status.text}
        </p>

        {showsPharmacyStatus && state.status === "denied" && (
          <p className="mt-1">{t("denied.body")}</p>
        )}

        {showsPharmacyStatus && state.status === "error" && (
          <>
            <p className="mt-1">
              {t(state.kind === "location" ? "error.locationBody" : "error.networkBody")}
            </p>
            <button type="button" onClick={onRetry} className={`mt-3 ${buttonClass}`}>
              {t("error.retry")}
            </button>
          </>
        )}

        {state.status === "results" && (
          <ResultsList
            pharmacies={state.pharmacies}
            origin={state.origin}
            headingRef={resultsHeadingRef}
          />
        )}
      </main>

      <footer className="mx-auto max-w-2xl border-t border-slate-200 px-4 py-4 text-sm text-slate-700">
        <p>
          {withElement(
            t("footer.source"),
            "codeServer",
            <a href={CODE_SERVER_URL} className={linkClass}>
              {t("footer.codeServer")}
            </a>,
          )}
        </p>
        <p className="mt-1">
          {withElement(
            t("footer.updated"),
            "date",
            <time dateTime={pharmaciesGeneratedAt}>
              {formatDate(pharmaciesGeneratedAt, i18n.locale)}
            </time>,
          )}
        </p>
      </footer>
    </div>
  );
}

export default App;
