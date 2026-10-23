# AI Usage

## Tools

- Claude Code (Claude Opus 5.5)

## Working agreement

The architecture, project structure, library choices and view design are owned by the author. The AI is used to research options, draft documentation and implement low-level code from the author's designs. Design decisions are only proposed or changed by the AI when this is explicitly requested.

## Log

### Phase 0 — Bootstrap and planning

- The project was scaffolded by the AI with `create-next-app@16.4.2`, at the author's request for the latest versions as of 2026-10-21 including the last security patches.
- The Next.js and React security advisories of 2026-10-14 were checked by the AI. React was bumped from the scaffolded 19.3.0 to the patched 19.3.1.
- Node.js 24.22.1 LTS was pinned (`.nvmrc`, `engines`, `engine-strict`) after the outdated local Node version was flagged by the AI.
- The `npm audit` findings were triaged by the AI (dev-only `braces` advisory, no patched release) and documented as a known limitation.
- Initial ideas were proposed by the author. For each one, alternatives and trade-offs were researched and compared by the AI at the author's request:
  - design systems, including Framer Motion and Styled-Components,
  - Zod for schema validation,
  - Redux vs. per-module React Context,
  - hexagonal architecture vs. MVC,
  - RTL + Cypress for testing,
  - load testing,
  - SQLite vs. a JSON file for mock data,
  - i18n dictionaries,
  - API docs with Bruno.
- `docs/PLAN.md` was written by the author: intro, requirements, non-functional requirements, capacity estimates and modules. The AI's research was appended under "Architecture"; the trade-off tables were later removed by the author and only the picks were kept.
- `DECISIONS.md` was drafted by the AI from the author's picks.
- The sequence diagram (Mermaid) and the system design and wireframe diagrams (Excalidraw) were drafted by the author and improved by the AI from `docs/PLAN.md`.

### Phase 1 — Tooling

The tooling was implemented by the AI: Prettier + EditorConfig, stricter TypeScript settings with a `typecheck` script, Vitest + React Testing Library, and Playwright. It was implemented on the `feat/phase-01-tools` branch, split into conventional commits.

### Phase 2 — Domain core

The domain core was implemented by the AI on the `feat/phase-02-domain` branch, following the architecture and rules defined in `docs/PLAN.md`:

- Zod schemas with branded ids for users, accounts, movements, contacts and transfers.
- A money value object based on integer minor units.
- Login identifier and phone normalization (email or Mexican phone, normalized to E.164).
- Typed error codes, and the three transfer business rules as a pure function.
- Unit tests at 100% domain coverage.
- An ESLint boundary rule that keeps `src/domain` free of React, Next.js and outer-layer imports.

### Phase 3 — Ports, mock adapters and use cases

The application core and the mock data layer were implemented by the AI on the `feat/phase-03-mock-data` branch, following the hexagonal-lite design in `docs/PLAN.md`:

- Ports for repositories, the transfer ledger, the idempotency store, the payment processor, and the clock and id sources.
- In-memory adapters over a `globalThis` database seeded from typed fixtures. Latency is simulated and configurable, and the ledger commits atomically.
- A mock payment processor with weighted random outcomes and a forced-scenario override, enabled outside production.
- Use cases for authentication, account overview, movements, contacts and transfers. Transfers are confirmed with owner-scoped idempotency keys.
- A server-only composition root, ESLint layer boundaries, and unit tests for every layer.

### Phase 4 — Services

The HTTP layer was implemented by the AI on the `feat/phase-04-services` branch, following the API versioning and error contract decisions in `docs/PLAN.md`:

- Versioned v1 contracts (DTO schemas and mappers, RFC 9457 problem details).
- Route handlers under `/api/v1` with an httpOnly session cookie, plus an unversioned health probe.
- Simulated faults for read and auth endpoints.
- A Proxy route guard for protected pages.
- In-process route handler tests and API E2E checks.

### Phase 5 — Foundations

The UI foundations were implemented by the AI on the `feat/phase-05-foundations` branch, following the design system and i18n picks in `docs/PLAN.md`:

- Tailwind CSS v4 and shadcn/ui (Radix primitives, Nova preset), with base components and design tokens. A `success` token was added for credits, and dark mode follows the OS preference.
- Motion, loaded through `LazyMotion` with DOM features only and the reduced-motion preference honored.
- next-intl without locale routing: a typed es-MX dictionary, error code → message keys, and cached money and date formatters in the Mexico City time zone.
- A localized root layout, a mobile-first page shell with a skip link, and not-found and error pages.
- Unit tests for formatters, dictionary coverage and the shell, and an E2E check for the localized not-found page.
- Design tokens centralized in `src/styles/tokens.css` (palette, semantic tokens with `light-dark()`, Tailwind scales), with the brand-inspired palette derived and contrast-checked by the AI from the colors given by the author.
- A light / dark / system theme toggle (icon button with a menu), persisted in `localStorage`, applied before the first paint and synced across tabs, with E2E checks of the rendered colors.

### Phase 6 — Login

The login module was implemented by the AI on the `feat/phase-06-login` branch, after the author chose a Server Action over a client fetch to the API route:

- A login Server Action that reuses the login use case, sets the httpOnly session cookie and redirects to a validated `next` destination (open-redirect protection).
- A login page with instant client-side validation (the shared Zod schema), inline field errors, a pending state and an error banner for simulated faults; it also works without JavaScript.
- Unit tests for the action, the form and the redirect validation, and E2E tests for the flow, faults, redirects and the no-JavaScript path.
- E2E tests moved to a production build on a dedicated port, after a dev-server HMR reload loop under the test runner was diagnosed.

### Phase 7 — Home

The Home module was implemented by the AI on the `feat/phase-07-home` branch, stacked on the login branch:

- A data access layer (`getCurrentUser`) that verifies the session on every request, with a `/session-expired` route that clears stale cookies without a redirect loop.
- A server-rendered Home: the header (greeting, theme toggle, logout) in the segment layout, and the balance and movements streamed behind skeletons, with an empty state and an error state with retry.
- A logout Server Action that works without JavaScript.
- Unit tests for the data access layer, logout, the session-expired route and the Home components, and E2E tests for data, empty and error states, logout, stale sessions and theme switching.

### Phase 8 — New transaction

The transfer flow was implemented by the AI on the `feat/phase-08-new-transaction` branch, stacked on the Home branch:

- A scoped `TransferFlowProvider` (Context + `useReducer`) holding the draft and its idempotency key, with the wizard step kept in `?step=` and steps without their prerequisites sent back to the first gap.
- Amount, recipient and summary steps: business rules checked on the client with the shared domain functions, favorite contacts, an inline form that saves a new favorite through the API, a masked phone on the summary, and focus moved to each step title.
- A typed browser client for the v1 API that validates responses against the contracts, and a server loader for the balance and contacts with an error state.
- MSW-based tests for the API client and the wizard, and E2E tests for the flow; a demo account reserved for flows that create transfers keeps E2E specs independent of each other.

### Phase 9 — Confirmation and voucher

The confirmation outcomes and the voucher were implemented by the AI on the `feat/phase-09-voucher` branch, stacked on the transfer branch:

- A confirmation routine (pure and injectable) that aborts the request after a client timeout and then recovers the outcome by idempotency key instead of resending it; pending duplicates are polled the same way.
- A failure screen per error code with the next safe action: change the amount (insufficient funds, with a new key), retry with the same key (network, unknown) or check the status again (timeout).
- A server-rendered voucher by transfer id, scoped to its owner (404 otherwise), with a native share sheet or a copy fallback.
- Unit tests for the confirmation routine, the failure paths of the wizard and the voucher, and E2E tests for all five scenarios.

### Phase 10 — E2E tests

The E2E suite was completed by the AI on the `feat/phase-10-e2e` branch, stacked on the voucher branch. Most flows had already been covered phase by phase, so the gaps were filled:

- Automated WCAG 2.1 AA checks with axe on every screen and state (login errors, Home with data, empty and error states, each transfer step, the failure screen, the voucher and the not-found page), in both themes.
- A real contrast defect was found by those checks: the primary button hover (shadcn default `bg-primary/80`) dropped white text to 3.92:1, so it was darkened instead of made translucent.
- A keyboard-only transfer (Tab, Enter, Space and arrow keys), the skip link and the theme menu.
- A GitHub Actions workflow running lint, types, formatting and unit tests, then the E2E suite on Chromium and WebKit. It was published after the docs phase, since pushing workflow files required an extra token scope.

### Phase 11 — Documentation

The documentation was completed by the AI on the `feat/phase-11-docs` branch, stacked on the E2E branch:

- The open sections of `DECISIONS.md` (project structure, UI and business logic separation, edge cases, and what would be done differently), written from the implemented code. Planned items that were not delivered (Lighthouse CI, bundle and Web Vitals budgets) are listed there instead of being presented as done.
- A Bruno collection for every v1 endpoint, with assertions on each request. It was run twice in a row against a production build to confirm that it can be repeated.
- README updates: the collection, the extra test tooling and the current `npm audit` findings.

### Post-delivery fixes

Issues reported by the author while testing on a phone were debugged and fixed by the AI on the `fix/lan-dev-access` branch:

- The page was never hydrated over the local network, because the dev server rejects the HMR websocket from hosts other than `localhost`. The machine's LAN addresses were allowed as dev origins.
- Idempotency keys could not be generated over plain HTTP, since `crypto.randomUUID` is only exposed in secure contexts. A fallback built on `crypto.getRandomValues` was added.
- "Continuar" gave no feedback, because every wizard step was a router navigation that re-rendered the page on the server. Steps are now changed through the History API and applied instantly.
- Links, logout and "Reintentar" showed no pending state while waiting on the network. A spinner is now shown on each of them.
- A transfer of $910 against a balance of $12,000 was rejected for insufficient funds. No balance defect was found: the mock payment network drew that outcome at random, as the brief describes. On the author's decision, it is no longer drawn at random. It is only returned when the server's balance really does not cover the amount, and the flow then fetches the current balance.

### Accepted

- Patched dependency versions and the Node 24 LTS pin.
- Playwright over Cypress, on the grounds of free parallel runs and real WebKit coverage.
- Vitest over Jest, with MSW for network mocking.
- Performance budgets (Lighthouse CI, bundle size, Web Vitals) over load testing mocked endpoints.
- Idempotency keys, a typed error contract and server-side re-validation of business rules.
- A deterministic `x-mock-scenario` override, so the random confirmation outcomes can be tested.

## Decisions made by the author (not the AI)

- The working agreement itself: the design is owned by the author, and code is delegated to the AI phase by phase.
- Next.js + TypeScript on the App Router, with a mix of rendering strategies per page.
- Functional requirements, non-functional requirements (owner-scoped data, ACID, consistency over availability, idempotency, PII-ready data handling) and the 100M DAU capacity estimates.
- Zod as the single source of truth for schemas and contracts.
- Per-module React Context, as previously applied in an Ads Manager, chosen over Redux.
- Hexagonal architecture (ports and adapters), carried over from Go microservices experience and applied in a lightweight form.
- In-memory mock data instead of SQLite, given the deadline.
- i18n/l10n with dictionary files, starting with es-MX only.
- Next.js API routes for the mock services, with URL path versioning starting at `/api/v1`.
- Bruno for API documentation.
- Unit and integration testing as part of the scope.
- Selection of the final picks in `DECISIONS.md` from the researched options.
- Delivery split into phases, each on its own branch and committed separately, to show progress.
- Passive voice in all written documentation.
- Manual and system theme modes, a single icon toggle shown on Home only, and a centralized design token file.
- A neutral palette inspired by the Spin by OXXO brand colors (#5458C6, #F86500, #F8F8F8).
- Login submitted through a Server Action (progressive enhancement), with the API route kept for API clients.
- Insufficient funds returned only on a real balance shortfall instead of at random, so the outcome never contradicts the balance on screen.
