// The only server code (ADR 0004). Only /api/* requests reach it (run_worker_first in
// wrangler.jsonc); everything else is a static asset. Imports nothing from the UI.

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export default {
  // Routes go here as they are added (/api/geocode, ADR 0003).
  async fetch(_request: Request): Promise<Response> {
    return json({ error: "not_found" }, 404);
  },
} satisfies ExportedHandler<Env>;
