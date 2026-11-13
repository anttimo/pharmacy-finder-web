# 1. Pharmacy data source: OpenStreetMap via Overpass

- Status: Accepted
- Date: 2026-11-11
- Applies to: web app and iOS app (the iOS app lives in its own repository)

## Context

Both apps need to answer the same question: where is the nearest pharmacy to the user? That needs coordinates, a name and ideally an address and opening hours, for anywhere in Finland.

Finland has no single official spatial API for pharmacies. We looked at these sources:

| Source                                 | Coverage                                 | Coordinates | Problem                                                     |
| -------------------------------------- | ---------------------------------------- | ----------- | ----------------------------------------------------------- |
| OpenStreetMap (Overpass API)           | Nationwide                               | Yes         | Community-maintained, so completeness varies                |
| Helsinki Region Service Map API        | Helsinki, Espoo, Vantaa, Kauniainen only | Yes         | Regional only                                               |
| PRH / YTJ open data (TOL 47730)        | Nationwide                               | No          | Lists businesses, not locations                             |
| Suomi.fi Service Data Repository (PTV) | Public and municipal services            | Partial     | Patchy coverage of private pharmacies                       |
| Fimea open data                        | —                                        | —           | We didn't find a dataset with locations that can be queried |

The PRH registry is a poor fit for another reason. A pharmacy licence belongs to a pharmacist, who often trades as a sole proprietor and may also run up to three branch pharmacies (_sivuapteekki_) under the same registration. One business record can therefore stand for several physical locations, and the addresses would still have to be geocoded through another API.

## Decision

Use OpenStreetMap through the Overpass API as the only data source. Query it directly from the client, with no API key. The Worker added in [ADR-0004](0004-hosting.md) does **not** proxy Overpass (see "Revisited" below).

The query is a radius search around the user's location:

```
[out:json][timeout:15];
(
  nwr["amenity"="pharmacy"](around:{radius},{lat},{lon});
  nwr["healthcare"="pharmacy"](around:{radius},{lat},{lon});
);
out center tags;
```

- `nwr` covers pharmacies mapped as points, buildings or areas, and `out center` gives every result one coordinate.
- The query centre is rounded to 3 decimals (about 100 m) before it's sent, so Overpass never sees the user's exact position. Distances and sorting use the exact position on the device. The radius steps are much larger than the rounding.
- The results are de-duplicated by OSM id, sorted by straight-line distance on the client, and shown with `name`, `addr:*` and `opening_hours` when those tags exist. The UI labels distances as straight-line, since walking or driving distance will be longer.
- If nothing is found, the app widens the radius in steps (for example 2 → 10 → 50 km) before showing the empty state.

### Scope: Finland-first, global data path

Nothing requires the app to be Finland-only, but we build for Finland: the UI languages are fi/sv/en, and web address search uses a Finnish geocoder ([ADR-0003](0003-geocoding.md)). The pharmacy data path itself is not Finland-specific. The query has no country filter, so "Use my location" works anywhere OSM has pharmacies mapped, and iOS address search (Apple) works worldwide.

Going global would mean a different web geocoder (Digitransit covers Finland only), larger radius steps for sparse regions, and new languages and copy.

## Consequences

**Good**

- One code path and the same behaviour everywhere in Finland, in both apps.
- No keys, secrets or backend to host, which fits our "minimal dependencies" principle.
- Opening hours are shown as the raw OSM text when present. There is no "open now" status: it would need an `opening_hours` parser, and the tool doesn't need it.

**Bad, and how we handle it**

- **Data quality.** Some pharmacies may be missing or have out-of-date details. In a healthcare context we say so clearly: the UI tells users to check opening hours with the pharmacy before going, and we never claim the list is complete.
- **Availability and fair use.** The public Overpass instances are shared and rate-limited. We use a bounded radius, a request timeout and one fallback endpoint. There is no client-side cache: a user searches once or twice per visit, so it would add code without much benefit. Native clients set a descriptive `User-Agent`, as the Overpass usage guidelines ask. Errors lead to a clear retry state, not a blank screen.
- **Licence.** OSM data is under ODbL. Both apps show "© OpenStreetMap contributors" wherever results appear.
- **The Overpass operator sees the user's IP address** along with the rounded location. The privacy note says so. If that becomes unacceptable, it's a reason to move Overpass behind the Worker (see below).

## Revisited 2026-11-11: should Overpass go through the Worker?

[ADR-0003](0003-geocoding.md) and [ADR-0004](0004-hosting.md) add a Cloudflare Worker, so "no backend" no longer holds for the web app. We checked whether pharmacy queries should also go through it. **Decision: no, Overpass stays client-side.** Reasons:

1. **The proxy exists to protect a secret, and Overpass has none.** Proxying it adds code and attack surface (a route that forwards queries is hard to lock down) without fixing anything.
2. **Rate limits would get worse.** Overpass limits requests per IP address. Through a Worker, every user would share Cloudflare's outbound addresses. Called from the client, each user gets their own allowance.
3. **The core feature keeps working without hosting** ([ADR-0004](0004-hosting.md)), and both apps send the same query and get the same results.

**When to revisit:** if Overpass returns `429` errors often in practice, a shared cache becomes worthwhile, or the IP exposure becomes unacceptable. Then add a server route that builds the query itself (never forwarding raw Overpass QL) and caches by rounded location.
