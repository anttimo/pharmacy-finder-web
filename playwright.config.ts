import { defineConfig } from "@playwright/test";

const PORT = 4173;

// End-to-end smoke tests against the production build (`vite build` + `vite preview`), so the
// pharmacy list is a separate chunk exactly as it ships. Uses the installed Google Chrome
// (channel "chrome"): no browser download, which `ignore-scripts` would block anyway.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
