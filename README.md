# Mini Wallet Web App

A mini financial wallet built with Next.js 16 + TypeScript as a technical challenge. It simulates a basic money-transfer flow with mocked services:

**Login → Home → New Transaction → Confirmation / Voucher**

- **Login:** phone or email, with validation, loading and simulated error states, and a mocked persisted session.
- **Home:** balance, user name and recent movements, with loading, empty and error states.
- **New Transaction:** amount, a favorite or newly saved contact, and a summary before confirming.
- **Confirmation / Voucher:** a randomized mocked outcome (success, network error, insufficient funds, timeout, unknown), each with its own handling.

Business rules (amount > 0, amount ≤ balance, recipient required) live in a framework-agnostic domain core. They are enforced on the server behind versioned API routes (`/api/v1/*`) and reused in the UI for instant feedback.

## Design

### System design

![System design](docs/system-design.svg)

### Wireframes

![Wireframes](docs/wireframes.svg)

### Workflow

The full request flow, including the confirmation scenarios and idempotent retries, is in the [sequence diagram](docs/sequence-diagram.md).

Editable sources: [`system-design.excalidraw`](docs/system-design.excalidraw) and [`wireframes.excalidraw`](docs/wireframes.excalidraw). Open them at [excalidraw.com](https://excalidraw.com) or in the VS Code Excalidraw extension.

### Further reading

- [DECISIONS.md](DECISIONS.md): design decisions and their justification
- [AI_USAGE.md](AI_USAGE.md): how AI tools were used
- [docs/PLAN.md](docs/PLAN.md): working plan, requirements and capacity estimates

## Requirements

- Node.js **24.22.1** (LTS). Pinned in `.nvmrc`. `engines` plus `engine-strict` in `.npmrc` make npm refuse to install on older versions.
- npm 11 (bundled with Node 24)

## Getting started

```bash
nvm use                                # or install the version in .nvmrc
npm ci
npx playwright install chromium webkit # browsers for E2E tests (one-off)
npm run dev                            # http://localhost:3000
```

| Script                  | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| `npm run dev`           | Dev server (Turbopack)                                |
| `npm run build`         | Production build                                      |
| `npm run start`         | Serve production build                                |
| `npm run lint`          | ESLint                                                |
| `npm run typecheck`     | Route type generation + `tsc --noEmit`                |
| `npm run format`        | Format all files with Prettier                        |
| `npm run format:check`  | Verify formatting without writing                     |
| `npm test`              | Unit/component tests (Vitest, single run)             |
| `npm run test:watch`    | Unit/component tests in watch mode                    |
| `npm run test:coverage` | Unit/component tests with v8 coverage (`coverage/`)   |
| `npm run test:e2e`      | E2E tests (Playwright: desktop Chrome, mobile Safari) |
| `npm run test:e2e:ui`   | E2E tests in Playwright UI mode                       |

The E2E web server is started automatically: the dev server is reused locally, and the production build is tested when `CI` is set.

## Mock data

The services are backed by in-memory adapters seeded from typed fixtures (`src/adapters/mock/fixtures.ts`). Data is kept in memory for the lifetime of the server process.

| User       | Login identifier                      | Scenario                                                        |
| ---------- | ------------------------------------- | --------------------------------------------------------------- |
| Ana López  | `ana@example.com` or `55 1234 5678`   | Balance of $12,500.00 MXN, movements, contacts                  |
| Bruno Díaz | `bruno@example.com` or `55 8765 4321` | Balance of $500.00 MXN, no movements or contacts (empty states) |

Transfer confirmations are answered by a mock payment network that picks a weighted random outcome: success 60%, and 10% each for insufficient funds, network error, timeout and unknown error. The TIMEOUT outcome is modelled as a slow approval, so the result has to be recovered by idempotency key. A specific outcome can be forced per request for testing when overrides are enabled.

The mock behavior is configured through environment variables; see [`.env.example`](.env.example).

| Variable                 | Default                      | Description                                      |
| ------------------------ | ---------------------------- | ------------------------------------------------ |
| `MOCK_LATENCY_MS`        | `250-700` (`0` under test)   | Simulated latency per mock call (fixed or range) |
| `MOCK_TIMEOUT_DELAY_MS`  | `15000`                      | Delay of the TIMEOUT scenario                    |
| `MOCK_SCENARIO_OVERRIDE` | `enabled` outside production | Whether a forced scenario is honored             |

## Tech stack

| Package                       | Version | Notes                                                   |
| ----------------------------- | ------- | ------------------------------------------------------- |
| `next` / `eslint-config-next` | 16.4.2  | Includes the 2026-10-14 security patches (≥ 16.4.1)     |
| `react` / `react-dom`         | 19.3.1  | Pinned. 19.3.1 is React's 2026-10-14 security release   |
| `typescript`                  | 5.9.x   | Stricter flags on top of `strict` (see `tsconfig.json`) |
| `vitest` + Testing Library    | 5.x     | Unit and component tests (jsdom)                        |
| `@playwright/test`            | 1.64.x  | E2E tests                                               |
| `zod`                         | 4.x     | Domain schemas, API contracts and inferred types        |
| `prettier`                    | 3.x     | Formatting, integrated with ESLint                      |

## Known limitations

### Dependencies

- **`npm audit` reports 5 high-severity findings.** They come from a single advisory ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), `braces` stack-exhaustion DoS) pulled in through `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. It only affects lint tooling at dev time and is not in the runtime bundle. No patched `braces` release exists yet. The `npm audit fix --force` suggestion would downgrade `eslint-config-next` to 14.x, so that fix was not applied.
- **Mock data is not persisted.** It is reset on every server restart, and it is not shared across serverless instances. A database adapter behind the same ports would be required for that.
- **Login is mocked.** No secret is verified, and unknown identifiers are reported explicitly, which would allow account enumeration in a real system.
- **TypeScript 7 and ESLint 10 were deliberately not adopted.** The project stays on the majors that `create-next-app@16.4.2` sets up and supports (TS 5.x, ESLint 9). ESLint 9.39 prints a "no longer supported" deprecation warning on install.
- **The `unrs-resolver` and `fsevents` install scripts are denied** (`allowScripts` in `package.json`). Both scripts are only fallbacks for building or fetching native binaries, and prebuilt binaries are already shipped.
