# Nearest pharmacy (web)

Finds the pharmacies nearest to the user, or to a place they search for, in Finland. Single view. Pharmacy data comes from OpenStreetMap via the Overpass API, called straight from the browser ([ADR 0001](docs/adr/0001-pharmacy-data-source.md)). Address search uses the Digitransit geocoding API through our own proxy ([ADR 0003](docs/adr/0003-geocoding.md)).

**Scope:** Finland-first (fi/sv/en UI, Finnish address search), but the pharmacy data path is global. Keep the Overpass client free of Finland-specific assumptions (no country filters or Finnish-only parsing). Finland-specific behaviour belongs in the geocoding and UI layers.

## Stack

- React + TypeScript (strict) + Vite + Tailwind v4. Vitest + Testing Library.
- One Cloudflare Worker (planned, not built yet) serves the built SPA and exposes `/api/geocode`, which proxies Digitransit. It is the only server code, with no framework ([ADR 0004](docs/adr/0004-hosting.md)).

## Commands

**Status:** the Worker scaffold ([ADR 0003](docs/adr/0003-geocoding.md), [ADR 0004](docs/adr/0004-hosting.md)) isn't in the repo yet, so `npm run dev` runs plain Vite and `cf-typegen` doesn't exist. Delete this note when it lands.

- `npm run dev`: Vite + `@cloudflare/vite-plugin`. The SPA and the Worker run on one origin. Local key goes in `.dev.vars` (copy `.dev.vars.example`). Without it, search shows its error state and "Use my location" still works.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
- `npm run format` (oxfmt) formats the code; `npm run format:check` verifies it. Config in `.oxfmtrc.json`.
- `npm run cf-typegen`: regenerate Worker types after changing `wrangler.jsonc`

Before saying a task is done, run lint, format:check, typecheck and tests, and report the results.

## Ground rules

- **Minimal dependencies.** Don't add a package without asking first. A new runtime dependency needs an ADR. No data-fetching library, state library, router, component library, i18n library or SSR. Those were left out on purpose (see [ADR 0002](docs/adr/0002-minimal-dependencies.md)).
- **npm safety.** `.npmrc` sets `ignore-scripts=true`, `save-exact=true` (no `^` or `~`) and `min-release-age=7` (skips releases younger than 7 days; needs npm 11.10 or newer). If a new package really needs its install script (for example `esbuild` or `workerd`), first check whether it works without it. If not, allow just that package with `npm rebuild <package>` and say so in the commit message. Never turn `ignore-scripts` off globally. Dependabot uses the same 7-day cooldown. CI (`.github/workflows/ci.yml`) keeps `permissions: contents: read` and has no deploy credentials ([ADR 0004](docs/adr/0004-hosting.md)).
- **Structure.** State lives in `useState` and small custom hooks. Network code goes in `src/data/` as plain async functions (Overpass client, geocode client). `useNearestPharmacies()` wraps them with `useReducer` and `AbortController`. Pure logic (distance, parsing) goes in `src/lib/` and has unit tests. Worker code stays in its own folder and imports nothing from the UI.
- **Opening hours** are shown as the raw OSM `opening_hours` text when present. Don't compute an "open now" status.
- **Location UX.** Ask for location only when the user taps "Use my location", never on page load. The address/place search field is always visible: it covers denied permission, checking another area and desktop. No IP geolocation.
- **The Digitransit key never reaches the browser.** It lives only as a Worker secret: never in a Vite-bundled `.env` file, never in commits. Don't widen the proxy contract without updating [ADR 0003](docs/adr/0003-geocoding.md).
- **No hard-coded UI text.** Every visible string, `aria-label` and error message goes through `t()` and exists in fi, sv and en. Use the `add-ui-string` skill. Geocoding requests send the active language.
- **Accessibility is a requirement, not polish.** Use semantic HTML first and ARIA only where needed. Everything must be keyboard-reachable with a visible focus ring, and state changes are announced through one polite live region. The autocomplete follows the ARIA combobox pattern. The UI must work at 320 px width and 200 % zoom and respect `prefers-reduced-motion`. Run the `a11y-check` skill before finishing any UI work.
- **Every async state has UI:** idle, locating, loading, results, empty (after widening the radius), location denied, no search matches, and offline or API error with a retry.
- **Healthcare tone.** Plain, calm and short. Never claim the list is complete or that a pharmacy is definitely open. Wherever results appear, show the "check opening hours with the pharmacy" note and "© OpenStreetMap contributors".

## Decisions

Architecture decisions live in `docs/adr/` (index: [docs/adr/README.md](docs/adr/README.md)). Read the relevant ADRs before changing anything structural. Don't silently contradict an accepted ADR: propose a superseding one with the `write-adr` skill, and update the ADR index and any rule in this file that changes.

## Working style

- Keep changes small and focused, with one concern per commit.
- Test behaviour the user can see: query by role and accessible name, not by class names or implementation details. Mock `fetch` at the network boundary.
- If a requirement is unclear or two rules conflict, ask instead of guessing.
