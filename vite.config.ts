import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { configDefaults, defineConfig } from "vitest/config";

// Read here, not imported in the app: the list itself loads on the first search (ADR 0001),
// but the footer shows when it was generated on every page.
const { generatedAt } = JSON.parse(readFileSync("src/data/pharmacies.json", "utf8")) as {
  generatedAt: string;
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __PHARMACIES_GENERATED_AT__: JSON.stringify(generatedAt),
  },
  test: {
    environment: "jsdom",
    globals: true, // lets Testing Library auto-clean between tests
    setupFiles: ["./src/test/setup.ts"],
    exclude: [...configDefaults.exclude, "e2e/**"], // Playwright runs these (npm run test:e2e)
  },
});
