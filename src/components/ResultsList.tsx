import { useI18n } from "../i18n/context";
import { formatDistance, mapsHref, telHref } from "../lib/format";
import type { SearchOrigin } from "../hooks/useNearestPharmacies";
import type { PharmacyWithDistance } from "../lib/pharmacy";

// py-2 gives about 36 px tall targets: under the usual 44 px, chosen so the map and phone
// links don't sit far apart. Still above the WCAG 2.2 AA minimum of 24 px.
const linkClass =
  "inline-block py-2 text-blue-800 underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

export function ResultsList({
  pharmacies,
  origin,
}: {
  pharmacies: PharmacyWithDistance[];
  origin: SearchOrigin;
}) {
  const { t, locale } = useI18n();

  return (
    <section aria-labelledby="results-heading" className="mt-6">
      <h2 id="results-heading" className="text-xl font-semibold">
        {origin.kind === "place"
          ? t("results.headingPlace", { place: origin.label })
          : t("results.heading")}
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
            <p className="text-sm">
              <a
                href={mapsHref(pharmacy)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("results.mapLabel", { name: pharmacy.name })}
                className={linkClass}
              >
                {t("results.map")}
              </a>
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
