import { useEffect, useRef } from "react";
import { useI18n } from "../i18n/context";
import { formatDistance } from "../lib/format";
import type { PharmacyWithDistance } from "../lib/pharmacy";

export function ResultsList({ pharmacies }: { pharmacies: PharmacyWithDistance[] }) {
  const { t, locale } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Mounts once per completed search: move focus so the results are the obvious next stop.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section aria-labelledby="results-heading" className="mt-6">
      <h2
        id="results-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-xl font-semibold focus:outline-none"
      >
        {t("results.heading")}
      </h2>
      <p className="mt-2 text-sm text-slate-700">{t("results.checkHours")}</p>

      <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
        {pharmacies.map((pharmacy) => (
          <li key={pharmacy.id} className="py-3">
            <h3 className="font-semibold">{pharmacy.name ?? t("results.unnamed")}</h3>
            <p className="text-sm text-slate-700">
              {t("results.distance", { distance: formatDistance(pharmacy.distanceMeters, locale) })}
            </p>
            {pharmacy.address && <p className="text-sm">{pharmacy.address}</p>}
            {pharmacy.openingHours && (
              <p className="text-sm break-words">
                {t("results.openingHours")} {pharmacy.openingHours}
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-sm text-slate-700">{t("results.distanceNote")}</p>
      <p className="mt-1 text-sm">
        <a
          href="https://www.openstreetmap.org/copyright"
          className="text-blue-800 underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {t("results.attribution")}
        </a>
      </p>
    </section>
  );
}
