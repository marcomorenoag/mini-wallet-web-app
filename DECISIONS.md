# Design Decisions

## Stack & tooling

| Area              | Decision                                                                                             | Justification                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Runtime           | Node.js 24 LTS (pinned in `.nvmrc`, enforced via `engines`)                                          | The latest LTS line was chosen so that security patches are received and every environment runs the same version.               |
| Framework         | Next.js 16 (App Router) + React 19                                                                   | The App Router was chosen because it enables Server Components, streaming and Server Actions alongside Route Handlers.          |
| UI components     | shadcn/ui                                                                                            | Components are copied into the repository, so they are owned and can be tailored instead of being overridden from a package.    |
| Styling           | Tailwind CSS v4 + design tokens as CSS variables                                                     | Zero-runtime styling was required for Server Components, and tokens keep the visual language consistent and themeable.          |
| Design tokens     | A single layered file (`src/styles/tokens.css`): palette → semantic tokens → Tailwind theme          | Colors, spacing, radius, type and motion can be reviewed and changed in one place, without touching components.                 |
| Color palette     | Neutral palette inspired by the Spin by OXXO brand (#5458C6, #F86500, #F8F8F8)                       | Brand recognition was kept while readability was prioritized: every text pair meets WCAG AA in both themes.                     |
| Theming           | Light, dark and system modes; the choice is stored in `localStorage` and applied by an inline script | The theme is applied before the first paint, and pages can stay static because no cookie is read on the server.                 |
| Animation         | Motion (formerly Framer Motion)                                                                      | The most mature React animation library was selected; it is limited to client components.                                       |
| Schema validation | Zod 4                                                                                                | One schema is shared by forms, API boundaries and inferred types, so validation and contracts cannot drift apart.               |
| Money             | Integer minor units (cents) + currency code, `Intl.NumberFormat`                                     | Floating-point amounts were ruled out because rounding errors can corrupt balances.                                             |
| Server state      | React Server Components + revalidation                                                               | Data is fetched on the server close to its source, so no client-side cache layer is needed for balance and movements.           |
| Client state      | Context + `useReducer`, scoped to the transfer flow                                                  | The small amount of client state did not justify a global store such as Redux, and scoping prevents app-wide re-renders.        |
| Wizard step       | Kept in the URL (`?step=…`)                                                                          | Refresh and browser back navigation are preserved across the transfer steps.                                                    |
| Architecture      | Hexagonal-lite + feature-based folders + hooks as view-models                                        | Business rules are isolated from frameworks and data sources, while ports are only introduced at real I/O boundaries.           |
| Mock data         | In-memory repository adapters seeded from typed TS fixtures                                          | Fixtures are type-checked by the compiler, and the adapter can be replaced by a real database without touching the domain.      |
| i18n / l10n       | next-intl (without locale routing), es-MX only                                                       | All copy is kept in typed dictionaries with ICU formatting, and further locales can be added without changing components.       |
| Services          | Next.js Route Handlers (`app/api/v1/*`)                                                              | Mock data is served through API routes, as required, behind the same use cases consumed by Server Components.                   |
| API versioning    | URL path versioning, starting at `/api/v1`                                                           | Versions are explicit, cacheable and easy to route; contracts are versioned at the boundary while the domain stays unversioned. |
| API documentation | Bruno collection                                                                                     | Requests are stored as plain-text files in the repository, so they are versioned and can be run without an account.             |
| Unit tests        | Vitest + React Testing Library                                                                       | Vitest was preferred over Jest for its speed and native ESM support; async Server Components are covered by E2E instead.        |
| Network mocking   | MSW                                                                                                  | The same request handlers are reused across component and hook tests without patching `fetch`.                                  |
| E2E tests         | Playwright                                                                                           | It was chosen over Cypress for free parallel runs, real WebKit (mobile Safari) coverage and built-in network interception.      |
| Performance       | Lighthouse CI budgets, bundle analyzer, Web Vitals, axe                                              | Load testing mocked endpoints was considered of low value, so user-facing performance and accessibility are measured instead.   |

## Cross-cutting decisions

- **Idempotency:** an idempotency key is generated once per transfer draft and reused on retries, so a transfer is never applied twice.
- **Timeouts:** after a timeout, the outcome is treated as unknown and its status is queried by idempotency key instead of being retried blindly.
- **Error contract:** errors are modelled as a typed union of codes (`INSUFFICIENT_FUNDS | NETWORK | TIMEOUT | UNKNOWN | VALIDATION`) and are mapped to UI states and dictionary keys.
- **Business rules:** amount, balance and recipient rules are validated in the client for feedback and re-validated on the server, which is the source of truth.
- **Session & permissions:** the mock session is stored in an `httpOnly` cookie, routes are guarded optimistically in `proxy.ts`, and ownership is re-checked in the use-case layer.
- **Login submission:** the login form is submitted through a Server Action that calls the same use case as `POST /api/v1/auth/login`, so it works without JavaScript; the `next` destination is validated to prevent open redirects. Transfers use the API routes, so both mechanisms are showcased.
- **Data access layer:** pages resolve the user through a request-memoized `getCurrentUser()`, which re-verifies the session; an invalid session is sent through `/session-expired`, which clears the cookie, since the proxy would otherwise bounce it between login and Home.
- **E2E target:** E2E tests run against a production build on a dedicated port, because dev-mode HMR reloads made interactions flaky under the test runner.
- **Rendering:** Home is server-rendered with streaming, the transfer flow is client-rendered, and the voucher is server-rendered by transaction id so it survives a refresh.

## Project structure

_TBD_

## UI and business logic separation

_TBD_

## Edge cases considered

_TBD_

## What would be done differently with more time

_TBD_
