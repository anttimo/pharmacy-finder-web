# 2. Minimal dependencies (web)

- Status: Accepted
- Date: 2026-11-11
- Applies to: web app

## Context

The app does one thing: find a location (device location or an address search) and show the nearest pharmacies as a sorted list. There is one view, no mutations and no state shared between screens.

It makes two kinds of requests:

- **Pharmacy lookup:** one Overpass query each time the user asks ([ADR-0001](0001-pharmacy-data-source.md)).
- **Address autocomplete:** repeated small requests to `/api/geocode` while the user types ([ADR-0003](0003-geocoding.md)).

Every dependency adds bundle size, upgrade work and code a reviewer has to trust.

## Decision

Use React, TypeScript, Vite and Tailwind. Do not add the libraries usually reached for in larger apps:

| Usually              | Here instead                                                                                                                     | Why it's enough                                                                                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TanStack Query / SWR | Plain async functions in `src/data/` (Overpass client, geocode client) + small hooks built on `useReducer` and `AbortController` | The hard parts of the pharmacy lookup (endpoint fallback, widening the radius) are specific to this app and would live inside a `queryFn` anyway. Autocomplete needs only a delay before the request and cancelling the previous one: about 20 lines |
| Redux / Zustand      | `useState` and custom hooks                                                                                                      | No state shared across screens                                                                                                                                                                                                                       |
| React Router         | None                                                                                                                             | Single view                                                                                                                                                                                                                                          |
| Component library    | Small accessible components built by hand, including the combobox                                                                | A few components, and full control over a11y and look                                                                                                                                                                                                |
| i18next / FormatJS   | A typed dictionary (fi/sv/en) + `Intl`                                                                                           | A few dozen strings. Typecheck catches missing translations                                                                                                                                                                                          |

The rule covers **runtime** dependencies, meaning code that ships to the browser or runs in the Worker. Dev-only tools that add nothing to the bundle (Vitest, oxlint, `wrangler`, `@cloudflare/vite-plugin`; see [ADR-0004](0004-hosting.md)) are fine when they earn their place. Tailwind counts as build-time: it compiles to one small CSS file and ships no JavaScript.

A new runtime dependency needs a short ADR that supersedes or amends this one.

## Consequences

**Good**

- Small bundle and a fast first load on mobile connections.
- Each piece is small enough to read and test directly.
- The request states map one-to-one onto UI states: `idle | locating | loading | results | empty | denied | error`.

**Bad, and how we handle it**

- **We own race handling and cancellation.** Stale requests are aborted, and tests cover:
  - a new search started while one is running
  - typing quickly in the search field (only the last request's result is shown)
  - retry after an error
- **No devtools or ready-made retry/backoff.** That's acceptable for two simple request types and a manual retry button.
- **Autocomplete is the weakest point.** If it grows beyond a debounced request (caching suggestions, prefetching), revisit this ADR. TanStack Query would be the first addition.
