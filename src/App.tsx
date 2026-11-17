import { useRef, useState, type ReactNode } from "react";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { PlaceSearch } from "./components/PlaceSearch";
import { ResultsList } from "./components/ResultsList";
import type { Place } from "./data/geocode";
import { useNearestPharmacies, type NearestState } from "./hooks/useNearestPharmacies";
import { usePlaceSuggestions, type SuggestionsState } from "./hooks/usePlaceSuggestions";
import { pharmaciesGeneratedAt } from "./data/pharmaciesGeneratedAt";
import { useI18n, type I18n } from "./i18n/context";
import { formatDate } from "./lib/format";

const CODE_SERVER_URL = "https://koodistopalvelu.kanta.fi/";

const linkClass =
  "rounded-sm text-blue-700 underline hover:text-blue-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

const buttonClass =
  "min-h-11 rounded bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

/**
 * The one message for the polite live region. While the user is typing, it's about the
 * suggestions; otherwise about the pharmacy search. `visible: false` keeps it for screen
 * readers only, when the same information is already on screen.
 */
function statusMessage(
  state: NearestState,
  suggestions: SuggestionsState,
  { t, tn }: I18n,
): { text: string; visible: boolean } {
  switch (suggestions.status) {
    case "idle":
      break;
    case "loading":
      return { text: "", visible: true };
    case "results":
      return { text: tn("search.suggestions", suggestions.places.length), visible: false };
    case "empty":
      return { text: t("search.noMatches"), visible: true };
    case "error":
      return { text: t("search.error"), visible: true };
  }
  switch (state.status) {
    case "idle":
      return { text: "", visible: true };
    case "locating":
      return { text: t("status.locating"), visible: true };
    case "loading":
      return { text: t("status.loading"), visible: true };
    case "results":
      return { text: tn("status.found", state.pharmacies.length), visible: true };
    case "denied":
      return { text: t("status.denied"), visible: true };
    case "error":
      return {
        text: t(state.kind === "location" ? "status.locationError" : "status.networkError"),
        visible: true,
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
  const { state, locate, searchAt } = useNearestPharmacies();

  // The field's text, and the label of the place chosen from it. While they match, the
  // field shows a chosen place and there's nothing to suggest.
  const [text, setText] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const query = text === chosen ? "" : text;

  const lastSearchRef = useRef<LastSearch>({ kind: "device" });
  const locateButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // The button stays active during a search: tapping it again starts over. That's the way out
  // if the browser never answers, for example when its permission prompt is dismissed.
  const onLocate = () => {
    lastSearchRef.current = { kind: "device" };
    setText("");
    setChosen(null);
    locate();
  };

  const onChoose = (place: Place) => {
    lastSearchRef.current = { kind: "place", place };
    setText(place.label);
    setChosen(place.label);
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

  const status = statusMessage(state, suggestions.state, i18n);
  const showsPharmacyStatus = suggestions.state.status === "idle";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-4 p-4">
        <h1 className="text-2xl font-semibold">{t("app.title")}</h1>
        <LanguageSwitcher />
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-8">
        <p>{t("app.intro")}</p>

        <PlaceSearch
          text={text}
          onTextChange={setText}
          suggestions={suggestions.state}
          onChoose={onChoose}
          onChooseTop={suggestions.chooseTop}
          inputRef={inputRef}
        >
          <button ref={locateButtonRef} type="button" onClick={onLocate} className={buttonClass}>
            {t("locate.button")}
          </button>
        </PlaceSearch>
        <p className="mt-1 text-sm text-slate-700">{t("locate.privacy")}</p>

        <p role="status" className={status.visible ? "mt-4 font-medium" : "sr-only"}>
          {status.text}
        </p>

        {suggestions.state.status === "error" && (
          <button type="button" onClick={onRetrySuggestions} className={`mt-3 ${buttonClass}`}>
            {t("error.retry")}
          </button>
        )}

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
          <ResultsList pharmacies={state.pharmacies} origin={state.origin} />
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
