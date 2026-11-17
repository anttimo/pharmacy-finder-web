# 1. Pharmacy data source: the Fimea register, geocoded at build time

- Status: Accepted
- Date: 2026-11-16 (rewritten in place; replaces the 2026-11-11 Overpass decision)
- Applies to: web app and iOS app (the iOS app lives in its own repository)

## Context

Both apps answer one question: where is the nearest pharmacy? That needs a name, an address and coordinates for every pharmacy in Finland.

Fimea's pharmacy register is the official list of licensed pharmacies. It's published as an open classification on the Kanta code server (OID `1.2.246.537.6.200`, "Fimea - Apteekkirekisteri"), with a JSON API that needs no key. It has names, visiting and postal addresses, phone numbers, the pharmacy type and open/closed dates. It has **no coordinates and no opening hours**.

It also lists more than the public can use. Next to about 800 open pharmacies and branch pharmacies (_sivuapteekki_), it keeps closed entries for history, pharmacies licensed but not open yet, hospital pharmacies (_sairaala-apteekki_) and medicine centres (_lääkekeskus_).

## Decision

Use the Fimea register as the only source. A build script turns it into a static file, `src/data/pharmacies.json`, which is committed. The app finds the nearest pharmacies on the device, from that file, with straight-line distance. The user's location never leaves the device.

- **Loading:** the app loads the file with a dynamic `import()`, so Vite serves it as its own chunk (a few tens of KB gzipped), fetched from our own origin on the first search, not on page load. If that fetch fails, the user gets the error state with a retry.
- **Results:** the 3 nearest pharmacies, with no distance limit. Someone outside Finland still gets the nearest ones in Finland, each with its distance, so there's no empty state.
- **Each result** shows the name, address, straight-line distance and phone number (a `tel:` link). The page footer names the data source.

### Build pipeline: `npm run build:pharmacies`

`scripts/build-pharmacies.ts` runs on Node without dependencies ([ADR-0002](0002-minimal-dependencies.md)). The response parsing is in `scripts/kanta.ts`, with unit tests.

1. **Fetch every page** of `…/classifications/1.2.246.537.6.200/conceptcodes?pageSize=500&page=N` until `totalPages`.
2. **Check the count.** The order inside a page changes between requests, so the script counts unique `conceptCodeId`s and stops without writing if that differs from `totalItems`, or if `totalItems` changes while paging.
3. **Filter:** keep entries whose `beginDate` is today or earlier, whose `expirationDate` is today or later, and whose `ApteekkiTyyppi` is `Apteekki` or `Sivuapteekki`. This drops closed entries and the hospital-internal types `"Sairaala-apteekki"` and `"Lääkekeskus"`. Those supply hospital wards and don't serve the public, and some sit at logistics sites away from any hospital. A public pharmacy on hospital grounds is a normal `Apteekki` entry and stays in. The `beginDate` check keeps out pharmacies that are licensed but not open yet (they often have no address yet). Such a pharmacy joins the list on the first rebuild after it opens, once it has an address that geocodes.
4. **Map:** `conceptCodeId` → `id`, `Abbreviation` → `name` (the everyday name; `LongName` is often the licence's numbered name, such as "Helsingin 54. apteekki", and is only a fallback), `StreetAddress` → `address` (falling back to the street part of `PostAddress`), `PostNumber`, `PostOffice`, `PhoneNumber` (the first number, when an entry lists several), and `branch` for branch pharmacies.
5. **Geocode** each address with the Digitransit search API (`boundary.country=FIN`, one result, about 6 requests/s), with the same key as [ADR-0003](0003-geocoding.md), read from `DIGITRANSIT_API_KEY` or `.dev.vars`. The build runs locally, so the key still never reaches the browser. A rebuild reuses the coordinates in the current `pharmacies.json` for every pharmacy whose id, address, postcode and city are unchanged, so it only geocodes new or moved pharmacies. It reads the key only if something needs geocoding. `--regeocode` geocodes everything again, for example after changing the rules below. The query is "street, postcode post office". If that fails, a second query drops the post office, because the register often gives a village that the geocoder doesn't know as a town. The postcode still pins the area. Spot checks of the entries placed by the second query found them on the right street and postcode.
6. **Accept a match (from either query) only if** Pelias `confidence` is at least **0.8**, the layer is `address` or `venue` (a `street` match is a road's midpoint, which can be kilometres off), and the point is inside Finland's bounding box. Everything else goes to `scripts/needs-review.json` (gitignored) with a reason. **We never guess coordinates.** An entry stays out of the app until its address is fixed in the register or someone adds a checked address to `scripts/address-overrides.json` (committed). An override is keyed by register id, gives a street address (never coordinates), and is geocoded by the same rules. It records the register address it replaces. If the register's address later changes, the override is ignored with a warning, so a fix upstream always wins and stale overrides show up.
7. **Write** `src/data/pharmacies.json` with `generatedAt`, `sourceTotal`, `openTotal` and `needsReview`, so a reviewer can see how fresh and how complete the file is.

### Staleness and rerunning

Pharmacies open and close rarely, so updating the list daily or even weekly is enough. For this demo the list is updated manually. A live service could automate it with a cron job (see "Later: refresh on the server").

After a rerun, review the diff and commit it. A large drop in `openTotal`, or a jump in `needsReview`, means something changed upstream: check it before you commit.

### Later: refresh on the server

When hosting exists ([ADR-0004](0004-hosting.md)), a scheduled job (a Worker Cron Trigger) could run the same pipeline daily and publish the file (for example to KV or R2), with the committed file as the fallback. That would need its own ADR (secret handling, storage, what to do when the count check fails). Not worth it until the list's freshness becomes a real problem.

## Consequences

**Good**

- **Authoritative and complete.** Every licensed pharmacy that geocodes cleanly is listed, and the list doesn't depend on volunteers having mapped it.
- **Fast and private.** Search is a local sort over about 800 entries. No third party sees the user's location or IP address because of a pharmacy lookup.
- **Works without a key or hosting.** Anyone who clones the repo gets the committed file, so "Use my location" works without a Digitransit key.
- **Same data on both apps.** The iOS app can ship or download the same file.

**Bad, and how we handle it**

- **Stale between builds.** A pharmacy that closed last week can still appear. The UI already tells people to check with the pharmacy before going, and `generatedAt` makes the age visible.
- **Gaps from geocoding.** Entries in `needs-review.json` are missing from the app. That's why we never claim the list is complete.
- **No opening hours.** The register doesn't have them. The UI shows the phone number and the "check opening hours with the pharmacy" note, and never an "open now" status.
- **Finland only.** The data path is no longer global. Going beyond Finland would need a different source per country or using global source like Google Places.
- **Attribution.** The page footer always shows the source: "Pharmacy data source: Finnish Medicines Agency (Fimea) / THL CodeServer (Kanta Services)" (fi: "Apteekkitietojen lähde: Lääkealan turvallisuus- ja kehittämiskeskus Fimea / THL Koodistopalvelu"). A footer rather than an About page, because the app is a single view with no router ([ADR-0002](0002-minimal-dependencies.md)).

## Rejected: Overpass (OpenStreetMap)

The first version of this ADR (2026-11-11) queried OpenStreetMap through the public Overpass API from the client, by radius around the user. We dropped it because:

- **It timed out in practice.** The shared public instances often kept a request waiting for a free slot beyond any reasonable timeout, even with a fallback endpoint. A healthcare lookup can't depend on that.
- **Completeness varies.** OSM is community-mapped, with no guarantee that a pharmacy exists or is still open. The register is the official source.
- **Privacy.** The Overpass operator saw each user's IP address and rounded location.

Other options looked at then still don't fit: the Helsinki Region Service Map API is regional only, PRH/YTJ lists businesses rather than locations, and PTV covers private pharmacies patchily.
