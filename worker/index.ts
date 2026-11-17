// The only server code (ADR 0004). Only /api/* requests reach it (run_worker_first in
// wrangler.jsonc); everything else is a static asset. Imports nothing from the UI.
import { handleGeocode } from "./geocode";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/geocode") return handleGeocode(request, env);
    return Response.json(
      { error: "not_found" },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  },
} satisfies ExportedHandler<Env>;
