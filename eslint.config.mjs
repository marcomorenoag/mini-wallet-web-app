import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The domain core stays framework-agnostic: no React, Next.js or outer-layer imports.
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "react/*", "react-dom/*", "next", "next/*"],
              message: "The domain layer must not depend on React or Next.js.",
            },
            {
              group: ["@/*", "!@/domain/*"],
              message: "The domain layer must not import from outer layers.",
            },
            {
              group: ["server-only", "client-only"],
              message: "The domain layer must run on both client and server.",
            },
          ],
        },
      ],
    },
  },
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
