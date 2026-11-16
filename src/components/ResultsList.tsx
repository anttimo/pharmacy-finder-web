import { useEffect, useRef } from "react";
import { useI18n } from "../i18n/context";
import { formatDistance, telHref } from "../lib/format";
import type { PharmacyWithDistance } from "../lib/pharmacy";

const linkClass =
  "inline-block py-3 text-blue-800 underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

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
            <h3 className="font-semibold">{pharmacy.name}</h3>
            <p className="text-sm text-slate-700">
              {t("results.distance", { distance: formatDistance(pharmacy.distanceMeters, locale) })}
            </p>
            <p className="text-sm">
              {pharmacy.address}, {pharmacy.postcode} {pharmacy.city}
            </p>
            {pharmacy.phone && (
              <p className="text-sm">
                {t("results.phone")}{" "}
                <a
                  href={telHref(pharmacy.phone)}
                  aria-label={t("results.call", { name: pharmacy.name, phone: pharmacy.phone })}
                  className={linkClass}
                >
                  {pharmacy.phone}
                </a>
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-sm text-slate-700">{t("results.distanceNote")}</p>
    </section>
  );
}
