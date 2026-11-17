import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";
import { define } from "./vite.config.ts";

// Separate from vite.config.ts so tests don't boot the Workers runtime (ADR 0004). Worker
// tests call the handler directly and opt into Node with `// @vitest-environment node`.
export default defineConfig({
  plugins: [react()],
  define,
  test: {
    environment: "jsdom",
    globals: true, // lets Testing Library auto-clean between tests
    setupFiles: ["./src/test/setup.ts"],
    exclude: [...configDefaults.exclude, "e2e/**"], // Playwright runs these (npm run test:e2e)
  },
});
