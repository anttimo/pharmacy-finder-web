import { pharmaciesGeneratedAt } from "../data/pharmaciesGeneratedAt";
import { useI18n } from "../i18n/context";
import { withElements } from "../i18n/withElements";
import { formatDate } from "../lib/format";

const CODE_SERVER_URL = "https://koodistopalvelu.kanta.fi/";
const DIGITRANSIT_URL = "https://digitransit.fi/";
const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";
const ODBL_URL = "https://opendatacommons.org/licenses/odbl/1-0/";
const CURRENT_YEAR = String(new Date().getFullYear());

const linkClass =
  "rounded-sm text-indigo-700 underline underline-offset-2 hover:text-indigo-800 hover:decoration-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-700";

/** Data source, data date and the attributions the licences require (ADR 0001, ADR 0003). */
export function Footer() {
  const { t, locale } = useI18n();

  return (
    <footer className="mx-auto max-w-2xl border-t border-slate-200 px-4 py-4 text-sm text-slate-700">
      <p>
        {withElements(t("footer.source"), {
          codeServer: (
            <a href={CODE_SERVER_URL} className={linkClass}>
              {t("footer.codeServer")}
            </a>
          ),
        })}
      </p>
      <p className="mt-1">
        {withElements(t("footer.updated"), {
          date: (
            <time dateTime={pharmaciesGeneratedAt}>
              {formatDate(pharmaciesGeneratedAt, locale)}
            </time>
          ),
        })}
      </p>
      <p className="mt-1">
        {withElements(t("footer.locations", { year: CURRENT_YEAR }), {
          digitransit: (
            <a href={DIGITRANSIT_URL} className={linkClass}>
              {t("footer.digitransit")}
            </a>
          ),
        })}
      </p>
      <p className="mt-1">
        {withElements(t("footer.osm"), {
          osm: (
            <a href={OSM_COPYRIGHT_URL} className={linkClass}>
              {t("footer.osmName")}
            </a>
          ),
          odbl: (
            <a href={ODBL_URL} className={linkClass}>
              {t("footer.odblName")}
            </a>
          ),
        })}
      </p>
    </footer>
  );
}
