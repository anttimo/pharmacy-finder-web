import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { useI18n } from "./i18n/context";

function App() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-4 p-4">
        <h1 className="text-2xl font-semibold">{t("app.title")}</h1>
        <LanguageSwitcher />
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-8">
        <p>{t("app.intro")}</p>
      </main>
    </div>
  );
}

export default App;
