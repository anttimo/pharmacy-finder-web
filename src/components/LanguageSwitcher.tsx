import type { MouseEvent } from "react";
import { useI18n } from "../i18n/context";
import { LOCALES, type Locale } from "../i18n/translate";
import { urlWithLocale } from "../i18n/url";

// Real links (`?lang=fi`), so they also work opened in a new tab. A plain click switches
// in place instead of reloading, which would lose the current results.
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  const onClick = (event: MouseEvent<HTMLAnchorElement>, code: Locale) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return; // new tab or window: let the browser follow the link
    }
    event.preventDefault();
    setLocale(code);
    // Keep the address in step, so reloading or sharing it keeps this language.
    history.replaceState(history.state, "", urlWithLocale(location.href, code));
  };

  return (
    <div role="group" aria-label={t("language.label")} className="flex items-center text-sm">
      {LOCALES.map((code, index) => (
        <span key={code} className="flex items-center">
          {index > 0 && (
            <span aria-hidden="true" className="text-slate-500">
              |
            </span>
          )}
          <a
            href={urlWithLocale(location.href, code)}
            hrefLang={code}
            lang={code}
            aria-current={code === locale ? "true" : undefined}
            onClick={(event) => onClick(event, code)}
            // 44 px target, with the text pushed towards the separator.
            className={`inline-flex min-h-11 min-w-11 items-center px-1 ${index === 0 ? "justify-end" : "justify-start"} rounded-sm text-blue-700 underline hover:text-blue-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700 aria-[current]:font-semibold aria-[current]:text-slate-900 aria-[current]:no-underline`}
          >
            {code} <span className="sr-only">({t(`language.names.${code}`)})</span>
          </a>
        </span>
      ))}
    </div>
  );
}
