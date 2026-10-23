# Design Decisions

## Stack & tooling

| Area              | Decision                                                                                             | Justification                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime           | Node.js 24 LTS (pinned in `.nvmrc`, enforced via `engines`)                                          | The latest LTS line was chosen so that security patches are received and every environment runs the same version.                                |
| Framework         | Next.js 16 (App Router) + React 19                                                                   | The App Router was chosen because it enables Server Components, streaming and Server Actions alongside Route Handlers.                           |
| UI components     | shadcn/ui                                                                                            | Components are copied into the repository, so they are owned and can be tailored instead of being overridden from a package.                     |
| Styling           | Tailwind CSS v4 + design tokens as CSS variables                                                     | Zero-runtime styling was required for Server Components, and tokens keep the visual language consistent and themeable.                           |
| Design tokens     | A single layered file (`src/styles/tokens.css`): palette → semantic tokens → Tailwind theme          | Colors, spacing, radius, type and motion can be reviewed and changed in one place, without touching components.                                  |
| Color palette     | Neutral palette inspired by the Spin by OXXO brand (#5458C6, #F86500, #F8F8F8)                       | Brand recognition was kept while readability was prioritized: every text pair meets WCAG AA in both themes.                                      |
| Theming           | Light, dark and system modes; the choice is stored in `localStorage` and applied by an inline script | The theme is applied before the first paint, and pages can stay static because no cookie is read on the server.                                  |
| Animation         | Motion (formerly Framer Motion)                                                                      | The most mature React animation library was selected; it is limited to client components.                                                        |
| Schema validation | Zod 4                                                                                                | One schema is shared by forms, API boundaries and inferred types, so validation and contracts cannot drift apart.                                |
| Money             | Integer minor units (cents) + currency code, `Intl.NumberFormat`                                     | Floating-point amounts were ruled out because rounding errors can corrupt balances.                                                              |
| Server state      | React Server Components + revalidation                                                               | Data is fetched on the server close to its source, so no client-side cache layer is needed for balance and movements.                            |
| Client state      | Context + `useReducer`, scoped to the transfer flow                                                  | The small amount of client state did not justify a global store such as Redux, and scoping prevents app-wide re-renders.                         |
| Wizard step       | Kept in the URL (`?step=…`), updated through the History API                                         | Refresh and browser back navigation are preserved across the transfer steps, and a step change is applied instantly without a server round trip. |
| Architecture      | Hexagonal-lite + feature-based folders + hooks as view-models                                        | Business rules are isolated from frameworks and data sources, while ports are only introduced at real I/O boundaries.                            |
| Mock data         | In-memory repository adapters seeded from typed TS fixtures                                          | Fixtures are type-checked by the compiler, and the adapter can be replaced by a real database without touching the domain.                       |
| i18n / l10n       | next-intl (without locale routing), es-MX only                                                       | All copy is kept in typed dictionaries with ICU formatting, and further locales can be added without changing components.                        |
| Services          | Next.js Route Handlers (`app/api/v1/*`)                                                              | Mock data is served through API routes, as required, behind the same use cases consumed by Server Components.                                    |
| API versioning    | URL path versioning, starting at `/api/v1`                                                           | Versions are explicit, cacheable and easy to route; contracts are versioned at the boundary while the domain stays unversioned.                  |
| API documentation | Bruno collection                                                                                     | Requests are stored as plain-text files in the repository, so they are versioned and can be run without an account.                              |
| Unit tests        | Vitest + React Testing Library                                                                       | Vitest was preferred over Jest for its speed and native ESM support; async Server Components are covered by E2E instead.                         |
| Network mocking   | MSW                                                                                                  | The same request handlers are reused across component and hook tests without patching `fetch`.                                                   |
| E2E tests         | Playwright                                                                                           | It was chosen over Cypress for free parallel runs, real WebKit (mobile Safari) coverage and built-in network interception.                       |
| Performance       | Lighthouse CI budgets, bundle analyzer, Web Vitals, axe                                              | Load testing mocked endpoints was considered of low value, so user-facing performance and accessibility are measured instead.                    |

## Cross-cutting decisions

- **Idempotency:** an idempotency key is generated once per transfer draft and reused on retries, so a transfer is never applied twice.
- **Timeouts:** after a timeout, the outcome is treated as unknown and its status is queried by idempotency key instead of being retried blindly.
- **Error contract:** errors are modelled as a typed union of codes (`INSUFFICIENT_FUNDS | NETWORK | TIMEOUT | UNKNOWN | VALIDATION`) and are mapped to UI states and dictionary keys.
- **Business rules:** amount, balance and recipient rules are validated in the client for feedback and re-validated on the server, which is the source of truth.
- **Session & permissions:** the mock session is stored in an `httpOnly` cookie, routes are guarded optimistically in `proxy.ts`, and ownership is re-checked in the use-case layer.
- **Login submission:** the login form is submitted through a Server Action that calls the same use case as `POST /api/v1/auth/login`, so it works without JavaScript; the `next` destination is validated to prevent open redirects. Transfers use the API routes, so both mechanisms are showcased.
- **Data access layer:** pages resolve the user through a request-memoized `getCurrentUser()`, which re-verifies the session; an invalid session is sent through `/session-expired`, which clears the cookie, since the proxy would otherwise bounce it between login and Home.
- **Transfer draft:** the draft (amount, recipient, idempotency key) lives in memory in the flow provider and only the step is kept in the URL; a refresh restarts the flow, so a stale key is never reused for a different transfer.
- **Confirmation outcomes:** the client waits up to 10 s (`NEXT_PUBLIC_TRANSFER_TIMEOUT_MS`) and then polls the status by idempotency key; each failure code maps to one safe next action, and a final outcome (insufficient funds) requires a new key, while retryable failures reuse the same one.
- **Pending feedback:** every tap that waits on the network is acknowledged at once: forms and Server Actions show a spinner and are disabled, links swap their icon for a spinner while the destination loads (`useLinkStatus`), and error boundaries keep "Reintentar" busy until the segment is rendered again.
- **E2E target:** E2E tests run against a production build on a dedicated port, because dev-mode HMR reloads made interactions flaky under the test runner.
- **Rendering:** Home is server-rendered with streaming, the transfer flow is client-rendered, and the voucher is server-rendered by transaction id so it survives a refresh.

## Project structure

Code is grouped by layer on the server side and by feature on the UI side. Dependencies only point inwards: `domain` imports nothing from the other folders, and `app` is the only folder that knows about routing.

```text
src/
├── domain/            Entities, Zod schemas and pure business rules (money, transfer rules, errors)
├── ports/             Interfaces for every I/O boundary (repositories, ledger, processor, clock)
├── application/       Use cases that orchestrate the domain through the ports
├── adapters/
│   ├── mock/          In-memory repositories, fixtures, latency, faults and the mock payment network
│   └── system/        Real clock and UUID generator
├── contracts/v1/      Wire format of API v1: DTO schemas, mappers and problem details
├── server/            Composition root, request context, current-user DAL and HTTP helpers
├── app/               Routes only: pages, layouts, loading/error boundaries and `api/v1` handlers
├── features/          One folder per screen
│   └── <feature>/
│       ├── data.ts        Server-side loaders for Server Components
│       ├── actions.ts     Server Actions
│       ├── api.ts         Typed browser client (transfer only)
│       ├── model/         Pure client logic: reducers, guards, the confirmation routine
│       ├── use-*.ts       Hooks used as view-models
│       └── ui/            Presentational components
├── components/        Shared UI: shadcn primitives, layout shell, theme and motion
├── i18n/              next-intl config, formatters and error-code → message mapping
├── styles/            Design tokens
└── test/              Test helpers (MSW server, intl render, Next.js mocks)
messages/              Translation dictionaries (es-MX)
e2e/                   Playwright specs
bruno/                 Runnable API collection
```

## UI and business logic separation

- **Business rules live in the domain only.** Amount parsing, the three transfer rules and money arithmetic are pure functions in `src/domain`. They are imported by the use cases on the server and by the transfer flow in the browser, so the instant feedback and the server check can never disagree.
- **Use cases depend on ports, not on frameworks.** `src/application` does not import Next.js, React or the mock adapters. The concrete adapters are wired once in the composition root (`src/server/container.ts`), so the in-memory data can be replaced by a database without touching a use case.
- **Framework entry points are thin.** Route handlers, Server Actions and Server Components only read the request (session, scenario, body), call a use case and map the result to a response, a redirect or a view. HTTP details such as problem details, cookies and status codes stay in `src/server/http` and `src/contracts`.
- **Client logic is kept out of components.**
  - The transfer reducer, the step guard and the confirmation routine (timeout, status polling, error mapping) are pure modules in `features/transfer/model`. The routine receives its I/O as arguments, so every outcome is unit-tested without a browser or a network.
  - Hooks such as `useConfirmTransfer` and `useTransferStep` act as view-models: they bind the pure logic to React state, the router and the API client.
  - Components under `ui/` only render state and forward events.
- **Copy and visual values are data.** Text is read from the es-MX dictionary, with error codes mapped to message keys in one place (`src/i18n/error-messages.ts`). Colors, spacing, radius and motion are read from the token file.

## Edge cases considered

**Amounts and money**

- Amounts are parsed from text into integer cents without floats. Thousands separators are accepted, more than two decimals, letters and empty input are rejected, and zero or negative values are reported by the "greater than zero" rule.
- The balance shown in the browser can be stale, so the rules are run again on the server against the current balance. The ledger then re-checks the balance atomically, so two concurrent transfers cannot overdraw the account.

**Confirmation and retries**

- Double submission: the button is disabled while a confirmation is pending, and a second request with the same idempotency key returns the stored outcome instead of charging again. A concurrent request with a key that is still being processed receives `PENDING`.
- Final and retryable failures are kept apart. Insufficient funds is final: the key is kept, and a new key is generated when the amount is changed. Network, timeout and unknown failures release the key, so the same key can be retried safely.
- Timeout: the outcome is unknown, so the request is aborted on the client and the status is looked up by key every 1.5 s. A key with no record means nothing was applied, so a retry is offered. An outcome still unknown after every check is shown as a timeout with a "Consultar estado" action.
- The status lookup ignores forced fault scenarios, since a forced scenario describes the payment, not the lookup.

**Navigation and session**

- A refresh in the middle of the flow, or a deep link to `?step=summary`, is sent back to the first incomplete step. The draft is not restored, so a key is never reused for a different transfer.
- The session can expire mid-flow. An invalid session on a page load, or a `401` on confirmation, sends the user through `/session-expired`, which clears the cookie. Redirecting straight to login would loop, since the proxy sends cookie holders back to Home.
- The `next` parameter on login is accepted only for same-origin paths, which prevents open redirects.
- Login and logout work without JavaScript through Server Actions.

**Data access**

- Another user's voucher, or an unknown id, returns a real `404`, so the existence of a transfer is not revealed.
- Movements are listed newest first and are capped at the use-case limit.
- An account with no movements or contacts gets its own empty states (Bruno).

**Contacts**

- Phone numbers are normalized to E.164, and emails are lower-cased, before lookups.
- A contact with a phone that is already saved is rejected as a duplicate.

**Theme, motion and accessibility**

- The stored theme is applied before the first paint, so there is no flash of the wrong theme. When storage is unavailable, as in private mode, the system theme is used.
- Animations honor the reduced-motion preference.
- Focus is moved to each step title, and errors are announced through `aria-live` regions.
- Every screen and state is checked against WCAG 2.1 AA in both themes, which caught and fixed a low-contrast hover color.

## What would be done differently with more time

**Data and transfers**

- **A real database behind the same ports.** The data would be kept in PostgreSQL (SQLite for local development). Transfers would run in a single transaction, and a unique constraint on `(owner, idempotency key)` would back the idempotency guarantee across instances.
- **Idempotency keys bound to their payload.** A fingerprint of the request would be stored with each key. A reuse with a different amount or recipient would then be rejected (`422`) instead of returning the original outcome.
- **A reconciliation job for pending transfers.** Transfers left unresolved by the payment network would be settled in the background, instead of only being polled by the client.

**Authentication and security**

- **Real authentication.** A one-time code sent by SMS or email, or passkeys, would replace the identifier-only mock login. Login would be rate-limited, and the same response would be returned for unknown accounts to prevent enumeration.
- **Security headers and a nonce-based CSP.** These would be set in `next.config.ts` and the proxy.
- **PII handling.** Phone numbers would be encrypted at rest and masked in logs, in preparation for compliance audits.

**Quality and delivery**

- **Performance budgets and CI.**
  - Only the accessibility part of the performance and quality decision (axe) was implemented.
  - Lighthouse CI budgets (LCP, INP, CLS), a bundle-size budget and Web Vitals reporting were left out because of the deadline.
  - A GitHub Actions pipeline (lint, types, unit and E2E) was prepared but not published.
- **OpenAPI generated from the Zod contracts**, served at `/api/v1/docs`. The Bruno collection could then be generated from that single source.
- **Observability.** Structured logs, request ids and traces would be added through `instrumentation.ts`, with an error tracker on the client.

**Product**

- **A persisted transfer draft.** The draft would be kept in `sessionStorage`, so a refresh resumes the flow while the key is still unresolved.
- **Pagination** of movements with a cursor, and a transfer detail page from the movement list.
- **Storybook** for the shared components, with visual regression tests, plus more locales once the copy is final.
