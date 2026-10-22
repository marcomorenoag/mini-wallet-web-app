import { defineConfig, devices } from "@playwright/test";

import { assertNodeVersion } from "./scripts/assert-node-version";

assertNodeVersion();

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    // Mobile WebKit covers the Safari engine used by most mobile wallet users.
    { name: "mobile-safari", use: { ...devices["iPhone 15"] } },
  ],
  webServer: {
    // The production build is tested in CI; the dev server is reused locally for speed.
    command: isCI ? `npm run build && npm run start -- -p ${PORT}` : `npm run dev -- -p ${PORT}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    // Scenario overrides are disabled in production builds by default; E2E tests rely on them.
    env: { MOCK_SCENARIO_OVERRIDE: "enabled" },
  },
});
