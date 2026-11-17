import { useRef, type ReactNode } from "react";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { ResultsList } from "./components/ResultsList";
import { useNearestPharmacies, type NearestState } from "./hooks/useNearestPharmacies";
import { pharmaciesGeneratedAt } from "./data/pharmaciesGeneratedAt";
import { useI18n, type I18n } from "./i18n/context";
import { formatDate } from "./lib/format";

const CODE_SERVER_URL = "https://koodistopalvelu.kanta.fi/";

const linkClass =
  "rounded-sm text-blue-700 underline hover:text-blue-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

const buttonClass =
  "min-h-11 rounded bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

/** The one message for the polite live region. */
function statusMessage(state: NearestState, { t, tn }: I18n): string {
  switch (state.status) {
    case "idle":
      return "";
    case "locating":
      return t("status.locating");
    case "loading":
      return t("status.loading");
    case "results":
      return tn("status.found", state.pharmacies.length);
    case "denied":
      return t("status.denied");
    case "error":
      return t(state.kind === "location" ? "status.locationError" : "status.networkError");
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

function App() {
  const i18n = useI18n();
  const { t } = i18n;
  const { state, locate } = useNearestPharmacies();

  // The button stays active during a search: tapping it again starts over. That's the way out
  // if the browser never answers, for example when its permission prompt is dismissed.
  // The retry button disappears once the search restarts, so keep focus on the main button.
  const locateButtonRef = useRef<HTMLButtonElement>(null);
  const onRetry = () => {
    locateButtonRef.current?.focus();
    locate();
  };

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
          onClick={locate}
          className={`mt-4 ${buttonClass}`}
        >
          {t("locate.button")}
        </button>
        <p className="mt-2 text-sm text-slate-700">{t("locate.privacy")}</p>

        <p role="status" className="mt-4 font-medium">
          {statusMessage(state, i18n)}
        </p>

        {state.status === "denied" && <p className="mt-1">{t("denied.body")}</p>}

        {state.status === "error" && (
          <>
            <p className="mt-1">
              {t(state.kind === "location" ? "error.locationBody" : "error.networkBody")}
            </p>
            <button type="button" onClick={onRetry} className={`mt-3 ${buttonClass}`}>
              {t("error.retry")}
            </button>
          </>
        )}

        {state.status === "results" && <ResultsList pharmacies={state.pharmacies} />}
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
