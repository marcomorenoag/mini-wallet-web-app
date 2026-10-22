import { defineConfig, devices } from "@playwright/test";

import { assertNodeVersion } from "./scripts/assert-node-version";

assertNodeVersion();

// A dedicated port, so a local `npm run dev` on 3000 is never picked up by the tests.
const PORT = Number(process.env.E2E_PORT ?? 3100);
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
    // The production build is always tested. Under the test runner, the Turbopack dev server keeps
    // forcing HMR full reloads, which detaches elements mid-interaction and makes tests flaky.
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `${baseURL}/api/health`,
    // Never reused, so a stale build is never tested.
    reuseExistingServer: false,
    timeout: 180_000,
    // Scenario overrides are disabled in production builds by default; E2E tests rely on them.
    env: { MOCK_SCENARIO_OVERRIDE: "enabled" },
  },
});
