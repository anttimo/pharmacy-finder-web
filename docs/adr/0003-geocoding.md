# 3. Geocoding: Digitransit behind a narrow proxy (web), Apple on iOS

- Status: Accepted
- Date: 2026-11-11
- Applies to: web app (proxy, Digitransit) and iOS app (Apple; the iOS app lives in its own repository)
- Implementation: planned, the Worker is not in the repo yet

## Context

Location works in two ways:

- **"Use my location"**: browser geolocation or CoreLocation. Permission is requested when the user taps, not on page load.
- **Address/place search**: always visible. It covers the cases where permission was denied, the user wants to check another area, or they're on a desktop without good location data.

We don't use IP geolocation. It is often off by kilometres, which is useless for "nearest".

Search needs a geocoder that knows Finnish streets and places, returns Finnish and Swedish names, and supports autocomplete. Typing a few letters should suggest "Kamppi" or "Kampen".

| Option                                  | Finland quality                                         | fi/sv names           | Autocomplete                                                       | Key                                    | Problem                                                           |
| --------------------------------------- | ------------------------------------------------------- | --------------------- | ------------------------------------------------------------------ | -------------------------------------- | ----------------------------------------------------------------- |
| Digitransit geocoding (Pelias)          | Built for Finland; powers the national journey planners | `lang=fi\|sv\|en`     | Dedicated `/autocomplete` endpoint                                 | Required                               | The key must not reach the browser                                |
| Nominatim (OSM Foundation)              | Good                                                    | Partly                | **Usage policy forbids client-side autocomplete**; max 1 request/s | None                                   | Ruled out for a search-as-you-type field                          |
| Apple MapKit JS on web too              | Good                                                    | Yes                   | Yes                                                                | Signed token + Apple Developer Program | Paid membership, token signing and a large SDK for one text field |
| Apple on iOS (`MKLocalSearchCompleter`) | Good                                                    | Follows device locale | Yes                                                                | None                                   | iOS only                                                          |

## Decision

**Web:** use the Digitransit autocomplete API, called only through `GET /api/geocode` on our Worker ([ADR-0004](0004-hosting.md)). The browser never sees the key.

**iOS:** use `MKLocalSearchCompleter` / `CLGeocoder`. They're built in, free and need no key. The two apps don't need the same geocoder. Each uses its platform's best native option, and both feed the same pharmacy query ([ADR-0001](0001-pharmacy-data-source.md)).

### The proxy contract

```
GET /api/geocode?text=kamp&lang=sv&focus=60.17,24.93
200 { "results": [{ "label": "Kamppi, Helsinki", "lat": 60.17, "lon": 24.93 }] }
```

The proxy is deliberately narrow, so it can't be used as an open relay:

- **GET only.** Anything else gets `405`.
- **Allowlisted params:** `text` (required), `lang` (`fi | sv | en`) and `focus` (`lat,lon`). An unknown or repeated param gets `400`. We reject instead of silently dropping, so client bugs show up.
- **Length caps:** `text` is at most 100 characters, and the whole query string at most 256 (`414` otherwise).
- **Fixed upstream:** one hard-coded Digitransit URL. Result count is set on the server. The client can't pick layers, sources or the endpoint.
- **Key in a header** (`digitransit-subscription-key`), not in the URL, so it never appears in a logged URL. It is stored with `wrangler secret put` and kept in `.dev.vars` locally.
- **Reshaped response.** Only `label`, `lat` and `lon` are returned, so the client doesn't depend on Pelias' GeoJSON.
- **Focus point rounded to about 1 km** before it goes upstream. That's enough to rank nearby matches higher.
- **Failures:** a 5 s upstream timeout. Upstream errors become a generic `502` and are never passed through. A missing key returns `500 not_configured`.

On the client, input is debounced and stale requests are aborted (the same pattern as [ADR-0002](0002-minimal-dependencies.md)).

## Consequences

**Good**

- Finnish-quality search with proper fi/sv names, which suits a product built for Finland. (The UI ships in Finnish and English since 2026-11-13. The proxy still accepts `lang=sv`, so adding Swedish back needs no contract change.)
- The key stays secret, and the Worker only does this one job. The guards are a pure function, unit-tested without the Workers runtime.

**Bad, and how we handle it**

- **We now run server code.** It's one route of about 100 lines with no framework and no runtime dependencies ([ADR-0002](0002-minimal-dependencies.md)).
- **The guards limit how the proxy can be used, not who uses it.** Anyone can still call `/api/geocode` with valid params and spend our quota. That's acceptable at this scale. If abuse shows up, add Cloudflare's rate-limiting binding per IP.
- **Search depends on hosting.** Without a deployed Worker and key, search shows its error state, but "Use my location" still works because Overpass is called directly ([ADR-0001](0001-pharmacy-data-source.md)).
- **Different geocoders on web and iOS.** Suggestions can differ slightly between the apps. Pharmacy results won't, because both apps use the same Overpass query.
