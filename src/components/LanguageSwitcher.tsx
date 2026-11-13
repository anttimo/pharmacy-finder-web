import { useI18n } from "../i18n/context";
import { LOCALES, type Locale } from "../i18n/translate";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span>{t("language.label")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="min-h-11 rounded border border-slate-500 bg-white px-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code} lang={code}>
            {t(`language.names.${code}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
