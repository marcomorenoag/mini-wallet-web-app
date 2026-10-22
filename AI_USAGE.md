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
