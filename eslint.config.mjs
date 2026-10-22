import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const FRAMEWORK_IMPORTS = ["react", "react-dom", "react/*", "react-dom/*", "next", "next/*"];

/**
 * Hexagonal layering: each layer may only import from the layers listed as allowed.
 * domain ← ports ← application ← adapters; the composition root (src/server) wires them.
 */
const layer = (name, allowed, { framework = false, runtimeMarkers = false } = {}) => ({
  files: [`src/${name}/**/*.{ts,tsx}`],
  // Tests may wire real adapters to exercise a layer end to end.
  ignores: ["**/*.test.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          ...(framework
            ? []
            : [
                {
                  group: FRAMEWORK_IMPORTS,
                  message: `The ${name} layer must not depend on React or Next.js.`,
                },
              ]),
          {
            regex: `^@/(?!(?:${allowed.join("|")})/)`,
            message: `The ${name} layer may only import from: ${allowed.join(", ")}.`,
          },
          ...(runtimeMarkers
            ? []
            : [
                {
                  group: ["server-only", "client-only"],
                  message: `The ${name} layer must run on both client and server.`,
                },
              ]),
        ],
      },
    ],
  },
});

const layerBoundaries = [
  layer("domain", ["domain"]),
  layer("ports", ["domain", "ports"]),
  // Versioned API contracts are shared by server and client, so they only build on the domain.
  layer("contracts", ["domain", "contracts"]),
  layer("application", ["domain", "ports", "application"]),
  layer("adapters", ["domain", "ports", "adapters"], { runtimeMarkers: true }),
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...layerBoundaries,
  // Disables stylistic rules that conflict with Prettier; must stay last among configs.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated test artifacts:
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
