# Nearest pharmacy

Finds the pharmacies nearest to you, or to a place you search for, in Finland. The interface is available in Finnish, Swedish and English.

Pharmacy data comes from [OpenStreetMap](https://www.openstreetmap.org/copyright) via the Overpass API. It may be incomplete or out of date, so check opening hours with the pharmacy.

**Status:** early. The app shell, tooling and docs are in place. Pharmacy search and the Worker for address search are not built yet; they are planned in the [ADRs](docs/adr/README.md).

## Stack

React, TypeScript (strict), Vite and Tailwind v4, tested with Vitest and Testing Library. The plan is for a single Cloudflare Worker to serve the built app and proxy address search to Digitransit, so the API key stays on the server.

## Getting started

Requires Node.js 24 or newer and npm 11.10 or newer.

```sh
npm install
npm run dev
```

The repo's `.npmrc` disables dependency install scripts, pins exact versions and skips releases younger than 7 days. If a package needs a binary that its install script would download, run `npm rebuild <package>` for that package only.

Once the Worker lands, address search will need a Digitransit API key, which you can get from the [Digitransit developer portal](https://digitransit.fi/en/developers/). Without a key, search will show its error state, and "Use my location" still works because pharmacy data is fetched directly from Overpass ([ADR 0001](docs/adr/0001-pharmacy-data-source.md), [ADR 0003](docs/adr/0003-geocoding.md)). The key must never be committed or placed in a file Vite bundles.

For a deployed Worker, you will set the key with `npx wrangler secret put DIGITRANSIT_API_KEY` ([ADR 0004](docs/adr/0004-hosting.md)).

## Scripts

| Command                | What it does                       |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | Start the dev server               |
| `npm run build`        | Typecheck and build for production |
| `npm run lint`         | Lint with oxlint                   |
| `npm run typecheck`    | Typecheck with `tsc -b`            |
| `npm test`             | Run the tests once                 |
| `npm run format`       | Format the code with oxfmt         |
| `npm run format:check` | Check formatting                   |

## Project docs

- [`CLAUDE.md`](CLAUDE.md): project rules and conventions.
- [`docs/adr/`](docs/adr/README.md): architecture decisions (data source, dependencies, geocoding, hosting).
- [`.claude/skills/`](.claude/skills/): project skills for adding UI strings, accessibility checks and writing ADRs.

Map data © OpenStreetMap contributors.
