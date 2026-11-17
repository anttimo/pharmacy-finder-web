import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

// Read here, not imported in the app: the list itself loads on the first search (ADR 0001),
// but the footer shows when it was generated on every page.
const { generatedAt } = JSON.parse(readFileSync("src/data/pharmacies.json", "utf8")) as {
  generatedAt: string;
};

/** Build-time constants, shared with vitest.config.ts. */
export const define = {
  __PHARMACIES_GENERATED_AT__: JSON.stringify(generatedAt),
};

// https://vite.dev/config/
// cloudflare() runs the Worker (worker/index.ts) on the same origin as the SPA in dev and
// preview, and builds both (ADR 0004). Tests use vitest.config.ts, without it.
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  define,
});
