import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

import { assertNodeVersion } from "./scripts/assert-node-version";

assertNodeVersion();

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolves the "@/*" alias from tsconfig.json natively (Vite 8+).
    tsconfigPaths: true,
    alias: {
      // The marker throws outside React Server Components; server modules are tested in Node.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          // Server-side code (domain to route handlers) runs in plain Node: no DOM is needed.
          name: "node",
          environment: "node",
          include: [
            "src/{domain,application,adapters,server,test,contracts,i18n}/**/*.test.ts",
            "src/app/api/**/*.test.ts",
            "src/app/**/route.test.ts",
            "src/proxy.test.ts",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [
            "src/{domain,application,adapters,server,test,contracts,i18n}/**",
            "src/app/api/**",
            "src/app/**/route.test.ts",
            "src/proxy.test.ts",
          ],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
      reporter: ["text", "html"],
    },
  },
});
