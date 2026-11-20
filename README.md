# Nearest pharmacy

Finds the pharmacies nearest to you, or to a place you search for, in Finland. The interface is available in Finnish and English.

Pharmacy data comes from Fimea's pharmacy register, geocoded at build time ([ADR 0001](docs/adr/0001-pharmacy-data-source.md)). It may be incomplete or out of date, so check opening hours with the pharmacy.

**Status:** a complete demo. "Use my location" and address search both show the three nearest pharmacies, in Finnish or English. The app is served by a Cloudflare Worker, which also proxies address search.

**Next step:** the pharmacy list is rebuilt by hand, so it's only as fresh as the last rebuild. The next thing to build would be a daily rebuild with a GitHub Action. A Cloudflare cron job wouldn't fit the Workers Free plan's CPU limit, measured in [ADR 0001](docs/adr/0001-pharmacy-data-source.md) ("Next step: a daily rebuild").

**Live:** <https://pharmacy-finder.pharmacyfinder.workers.dev/>

## Stack

React, TypeScript (strict), Vite and Tailwind v4, tested with Vitest and Testing Library, plus Playwright smoke tests against the production build. A single Cloudflare Worker serves the built app and proxies address search to Digitransit, so the API key stays on the server.

## Getting started

Requires Node.js 24 or newer and npm 11.10 or newer.

```sh
npm install
npm run dev
```

The repo's `.npmrc` disables dependency install scripts, pins exact versions and skips releases younger than 7 days. If a package needs a binary that its install script would download, run `npm rebuild <package>` for that package only.

Address search needs a Digitransit API key, which you can get from the [Digitransit developer portal](https://digitransit.fi/en/developers/). Put it in `.dev.vars` (copy `.dev.vars.example`). Without a key, search shows its error state, and "Use my location" still works because the pharmacy list ships with the app ([ADR 0001](docs/adr/0001-pharmacy-data-source.md), [ADR 0003](docs/adr/0003-geocoding.md)). The same key is needed to rebuild that list with `npm run build:pharmacies`. The key must never be committed or placed in a file Vite bundles.

`npm run dev` runs the app and the Worker on one origin in the real Workers runtime, so the first start is a bit slower. It needs no Cloudflare account.

Hosting is optional. To deploy by hand, log in with `npx wrangler login`, set the key once with `npx wrangler secret put DIGITRANSIT_API_KEY`, then run `npm run build && npx wrangler deploy`. To deploy on every push to `main`, connect the repository to Cloudflare Workers Builds in the Cloudflare dashboard with the same build and deploy commands. GitHub Actions only runs CI and has no deploy credentials ([ADR 0004](docs/adr/0004-hosting.md)).

## Scripts

| Command                    | What it does                                           |
| -------------------------- | ------------------------------------------------------ |
| `npm run dev`              | Start the dev server                                   |
| `npm run build`            | Typecheck and build for production                     |
| `npm run lint`             | Lint with oxlint                                       |
| `npm run typecheck`        | Typecheck with `tsc -b`                                |
| `npm test`                 | Run the tests once                                     |
| `npm run test:e2e`         | Browser smoke tests (Playwright, installed Chrome)     |
| `npm run format`           | Format the code with oxfmt                             |
| `npm run format:check`     | Check formatting                                       |
| `npm run cf-typegen`       | Regenerate Worker types after editing `wrangler.jsonc` |
| `npm run build:pharmacies` | Rebuild the pharmacy list from the Fimea register      |

## Project docs

- [`CLAUDE.md`](CLAUDE.md): project rules and conventions.
- [`docs/adr/`](docs/adr/README.md): architecture decisions (data source, dependencies, geocoding, hosting).
- [`.claude/skills/`](.claude/skills/): project skills for adding UI strings, accessibility checks and writing ADRs.
