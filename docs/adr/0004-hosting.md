# 4. Hosting: one Cloudflare Worker with static assets

- Status: Accepted
- Date: 2026-11-11
- Applies to: web app
- Implementation: planned, the Worker scaffold is not in the repo yet

## Context

The repository is public. **A hosted version is optional.** It's still worth having: people can open a link instead of cloning the repo. Geolocation only works over HTTPS. And since [ADR-0003](0003-geocoding.md), something server-side has to hold the Digitransit key.

What we need:

- Serve a static SPA over HTTPS.
- Run one small server route (`/api/geocode`) with a secret.
- Local development that matches production, without juggling two dev servers.
- Run without a Cloudflare account. Anyone cloning the repo must be able to run it.

| Option                                   | Static SPA                | Server route + secret               | Local dev                                               | Problem                                                                                       |
| ---------------------------------------- | ------------------------- | ----------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Cloudflare Worker with static assets** | Yes, with an SPA fallback | Same Worker, same origin            | `@cloudflare/vite-plugin` runs the Worker inside `vite` | Cloudflare-specific config                                                                    |
| Cloudflare Pages (+ Pages Functions)     | Yes                       | Yes, via the `functions/` directory | `wrangler pages dev`, separate from Vite                | Two conventions for one small app; Cloudflare's newer tooling and guides focus on Workers     |
| GitHub Pages                             | Yes                       | **No**                              | Plain Vite                                              | No place for the key. It would end up in the bundle, or need a second host just for the proxy |

## Decision

Deploy the SPA and `/api/geocode` as **one Worker with static assets**.

- **`wrangler.jsonc`:**
  - `assets.not_found_handling: "single-page-application"`.
  - `assets.run_worker_first: ["/api/*"]`. Without it, the SPA fallback answers API routes with `index.html`.
  - Every other request is served as a static asset without running Worker code.
- **Worker:** `worker/index.ts` routes `/api/geocode` to `worker/geocode.ts`, and any other `/api/*` path gets a JSON `404`. No framework: one route doesn't need a router.
- **Secret:** `DIGITRANSIT_API_KEY`, set with `npx wrangler secret put DIGITRANSIT_API_KEY`. Locally it lives in `.dev.vars` (gitignored, with a committed `.dev.vars.example`).
- **Local dev:** `npm run dev` runs Vite with `@cloudflare/vite-plugin`. The SPA and the Worker share one origin and run in the real Workers runtime. No separate proxy config.
- **Types:** `npm run cf-typegen` (`wrangler types`) generates `worker-configuration.d.ts`. The Worker has its own `tsconfig.worker.json`.
- **Deploy:** Cloudflare's Git integration (Workers Builds) runs `npm run build` and `npx wrangler deploy` on pushes to `main`. GitHub Actions stays CI-only (lint, typecheck, test, build) and has no deploy credentials.

## Consequences

**Good**

- One origin. No CORS, and a tight CSP (`connect-src 'self'` plus the Overpass endpoints).
- One deploy and one config file. Dev runs the same runtime as production.
- Hosting stays optional. The client build (`dist/client`) is plain static files that any static host can serve. Moving away only loses the geocoding proxy.

**Bad, and how we handle it**

- **Cloudflare-specific config and two dev dependencies** (`wrangler`, `@cloudflare/vite-plugin`). Both are dev-only and add nothing to the bundle, so [ADR-0002](0002-minimal-dependencies.md)'s runtime rule still holds.
- **`npm run dev` boots the Workers runtime.** First start is a bit slower, and it needs the `workerd` binary, which npm installs. Unit tests use a separate `vitest.config.ts` and test the handler with an injected `fetch`, so they don't need the runtime.
