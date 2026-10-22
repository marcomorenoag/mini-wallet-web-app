# Intro

1. A four-modules web app to simulate a Mini Wallet Web App
2. All of the modules are connected into a flow as: Login -> Home -> New transaction -> Confirmation's Voucher
3. From the engineering standpoint, the codebase should be performant to scale up to millions of DAU

---

# Requirements

## Functional

1. Users can log into their accounts — out of scope: account creation and password reset
2. Auth users should be able to see their own account info (at Home module):
   1. Balance
   2. User name
   3. List of movements/operations — withdrawals or deposits
3. Auth users can receive deposits, adding up the transaction amount to their debit amount
4. Auth users should be able to start a new transaction to transfer money to another account

## Non Functional

Due to the nature of the application (dealing with money), it must:

- always serve and mutate data owned and belonging to the same user, i.e. client Alice MUST only see and operate on its own data (balance, money, etc)
- ensure ACID
- prioritize Consistency over Availability, but still having good availability (ex: ~99.9% -> 8h 46m of downtime / year)
- guarantee Idempotency of transactions -> no repeated/double transactions.
- make data highly secure -> this is going to be mock data, but should set the framework to isolate or threat the data as sensitive / PII, like for future PCI DSS compliance

The web app should be responsive and adapt to different screens.
Additionally, from the engineering standpoint, the system should be capable to scale up to Millions of DAU.
Let's assume 100M DAU:

- Login operations -> 100M / 10^5 (~seconds per day) = 1K rps
- Home operations (account details and list transfers)
  - Average of 10 operations / user
  - 100M \* 10 = 1B
  - 1B / 10^5 = 10K rps
- Transactions
  - Average of 10 / users = 10K rps

---

# Modules

## 01 - Login

- Should use mock data
- Contains a login page with:
  - A form asking for phone and email, which should be validated
  - Different states: loading or error page
- Once the access was successful:
  - there has to be a session persisted
  - user should be taken into the Home page

## 02 - Home

- Should display account balance and account details (user name)
- Lists all the transactions for that account
- Should display a CTA to transition users onto the New Transaction module
- Displays different states: loading, empty or error page

## 03 - New transaction

- Asks for an amount to transfer
- Displays a list of favorite contacts to choose the destination of the transfer
- Users can manually enter a new contact and save it into their favorite contacts
- Must display a summary page for the transaction operation, and ask for confirmation
- When a response arrives, directs users to the Voucher module

## 04 - Voucher

- If the transfer failed, it should display an error page with reason of failure
- If it was successful, it should display a voucher with the details

---

# Architecture

## 1. UI / Design system

**Animation / styling**

- Framer Motion → now **Motion** (`motion` pkg, `import { motion } from "motion/react"`).
  **Pick:** shadcn/ui + Tailwind v4 + Motion, design tokens (color/spacing/radius) as CSS variables. Fallback without Tailwind: Radix/Base UI + CSS Modules or vanilla-extract.

## 2. Schema validation (single source of truth)

Schemas live in the domain core and are reused by: client form (UX feedback), API route / Server Action (enforcement), and types (`z.infer`).

**Pick:** Zod 4.

**Domain rule:** money as **integer minor units (cents) + currency code**, formatted with `Intl.NumberFormat`. Never floats because of inaccurate rounding that can lead to balance errors.

## 3. State management

Split:

- **Server state** (balance, movements, contacts): needs caching/refetch/invalidation → Server Components + `revalidatePath` / `router.refresh()`, or TanStack Query. Not Redux/Context.
- **Client state** (tiny): transaction draft (amount, recipient, step) + UI flags. Session lives in a cookie, not client state.

**Pick:** scoped `TransferFlowProvider` (Context + `useReducer`) only on the transaction route; server state via RSC (or TanStack Query). Redux is hard to justify with this little client state. Zustand = middle ground.

Key consideration: wizard step in the URL (`?step=summary`, or `nuqs`) so refresh/back work.

## 4. Code architecture

**Hexagonal-lite** (ports & adapters only at I/O boundaries) + feature-based folders + hooks as view-models:

```
domain/      pure TS: Money, Transaction, validateTransfer(), error codes  -> no React, no Next
ports/       interfaces: TransactionRepository, ContactRepository, SessionPort
adapters/    in-memory mock repos (server-only), HTTP client (browser)
features/    login | home | transfer | voucher → { ui, hooks, api }
app/         routes; route handlers + RSC call use cases through ports
```

- Rules testable as pure functions, run on client and server; mocks → real backend = new adapter.
- RSC must **not** fetch its own API routes over HTTP (anti-pattern): route handler and RSC both call the same use case.
- No DI containers (inversify); a single composition-root factory. Use the `server-only` package on adapters.

## 5. Mock data strategy

**Pick:** in-memory repository adapters seeded from **typed TS fixtures** (`satisfies User[]`, so the compiler checks them).

- Kept in a `globalThis` singleton so the data survives HMR.
- Data is partitioned by session/user id, so each user only sees their own data (enforcing the ownership NFR).
- Simulated latency.
- Deterministic scenario override (`x-mock-scenario` header/cookie, honored only outside production) for tests.
- Limitations go in the README: data resets on restart and isn't shared across serverless instances.

## 6. i18n / l10n (es-MX only, for now)

- All UI strings live in dictionary files (`messages/es-MX.json`, or a `.ts` file for typed keys); no hard-coded copy.
- Keys are typed: a missing key is a compile error.
- Domain and API return **error codes**, never user-facing strings; the UI maps code → dictionary key. Zod issues map to codes the same way.
- Formatting is centralized: `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })` and `Intl.DateTimeFormat`, plus `<html lang="es-MX">`.
- With a single locale there's no `[locale]` route segment; URLs stay clean. Adding locale routing later doesn't touch components.

**Pick:** next-intl without routing.

## 7. API layer & docs

- **Route Handlers** (`app/api/v1/.../route.ts`) serve mock data. Required by the challenge ("API router con datos mockeados").
- **API versioning:** URL path versioning, starting at `/api/v1/*`.
  - Request/response contracts (Zod schemas + DTO mappers) are versioned at the boundary (`contracts/v1`); domain and use cases stay unversioned.
  - A breaking change adds `/api/v2/*` with its own contracts and mappers over the same use cases, so v1 keeps working until it is deprecated.
  - Additive, non-breaking changes (new optional fields) stay in the current version.
- Decide which mutations go through Server Actions and which through route handlers; showcasing both is valued.
- Docs:
  - **Bruno**: plain-text `.bru` files in the repo, no account, runnable by reviewers, and the `bru` CLI can run them as API tests in CI.
  - Stronger alternative: **OpenAPI generated from Zod** (`zod-openapi`), served with Scalar at `/api/v1/docs`; Bruno can import it.
  - If time is short, do one: Bruno is quicker, OpenAPI tells the better single-source-of-truth story.

## 8. Testing

- **Unit:** Vitest + RTL (faster than Jest, ESM-native, official Next guide). Async Server Components can't be unit-tested, so covered in E2E.
- **E2E: Playwright over Cypress.**
  - Free parallel runs, real WebKit (mobile Safari), `page.route` interception, trace viewer.
  - Cypress runs only inside its own browser, needs paid Cloud for parallelism, and its WebKit support is experimental.
- **MSW** for network mocking in component/hook tests.
- **Deterministic scenarios:** a `x-mock-scenario` override, without which the 5 confirmation outcomes can't be E2E-tested.
- **Performance instead of load testing:** k6 against mocks only measures the mock. Better value:
  - Lighthouse CI budgets (LCP/INP/CLS)
  - Bundle-size budget (`@next/bundle-analyzer`)
  - `useReportWebVitals`
  - `@axe-core/playwright` for a11y

  Optionally a tiny k6 script plus a DECISIONS.md note on what to measure in production.

## 9. Cross-cutting considerations

**Critical**

1. **Idempotency key on confirm.** Generate it once per draft and reuse it on retries; the server returns the same result for the same key. After a timeout the outcome is _unknown_: query status by key instead of blindly retrying.
2. **Typed error contract.** A discriminated union `INSUFFICIENT_FUNDS | NETWORK | TIMEOUT | UNKNOWN | VALIDATION`, shared by API and UI, optionally in RFC 9457 Problem Details format. Each code maps to a UI state.
3. **Balance is re-validated server-side at confirm time**, because the client copy may be stale.
4. **Session and permissions:**
   - mock session in an `httpOnly` cookie,
   - optimistic route guards in **`proxy.ts`** (Next 16 renamed `middleware.ts` → Proxy),
   - the real check repeated in the use-case/data layer.
5. **Rendering split:**
   - Home: RSC/SSR + streaming; `loading.tsx`/`error.tsx` cover the required states.
   - Transfer form: CSR.
   - Voucher: SSR by transaction id, so it survives refresh and can be shared.

**Nice to have**

- Strict TS extras (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) + `typecheck` script
- Prettier, Husky + lint-staged, GitHub Actions CI (lint → typecheck → unit → e2e)
- a11y: focus management between wizard steps, `aria-live` errors; mobile-first layout
- Security headers / CSP in `next.config.ts`
- `instrumentation.ts` + logging stub
- Storybook: skip (time)

---

# Delivery plan

Deadline: 2026-10-23 09:00. One commit (or a few) per phase.

| Tier       | Scope                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| **Must**   | 4 screens, business rules enforced server-side, 5 confirmation scenarios, README / DECISIONS / AI_USAGE |
| **Should** | Unit + E2E tests, idempotency, typed errors, i18n dictionary                                            |
| **Could**  | Bruno/OpenAPI, Lighthouse CI, CI pipeline, security headers                                             |

Proposed phases:

0. Bootstrap: scaffold, Node pin, docs skeleton
1. Tooling: Prettier, strict TS, `typecheck`, Vitest + RTL, Playwright
2. Domain core: Money, Zod schemas, transfer rules, error codes + unit tests
3. Mock data: ports, in-memory adapters, typed fixtures, latency + scenario override
4. Services: route handlers, mock session cookie, `proxy.ts` guards
5. Foundations: design system + tokens, layout shell, i18n dictionary + formatters
6. Login
7. Home
8. New transaction flow (amount → recipient → summary)
9. Confirmation / Voucher: 5 scenarios, retry, idempotency
10. E2E tests for the main flow + scenarios
11. Docs: README, DECISIONS.md, AI_USAGE.md, (Bruno/OpenAPI)
