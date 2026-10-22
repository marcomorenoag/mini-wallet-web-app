# Mini Wallet Web App

Web challenge: a mini financial wallet (Login → Home → New Transaction → Confirmation/Receipt) built with Next.js + TypeScript and mocked services.

## Requirements

- Node.js **24.22.1** (LTS). Pinned in `.nvmrc`. `engines` plus `engine-strict` in `.npmrc` make npm refuse to install on older versions.
- npm 11 (bundled with Node 24)

## Getting started

```bash
nvm use          # or install the version in .nvmrc
npm ci
npm run dev      # http://localhost:3000
```

| Script          | Description             |
| --------------- | ----------------------- |
| `npm run dev`   | Dev server (Turbopack)  |
| `npm run build` | Production build        |
| `npm run start` | Serve production build  |
| `npm run lint`  | ESLint                  |

## Tech stack

| Package                          | Version | Notes                                                   |
| -------------------------------- | ------- | ------------------------------------------------------- |
| `next` / `eslint-config-next`    | 16.4.2  | Includes the 2026-10-14 security patches (≥ 16.4.1)     |
| `react` / `react-dom`            | 19.3.1  | Pinned. 19.3.1 is React's 2026-10-14 security release   |
| `typescript`                     | 5.9.x   |                                                         |

## Known limitations

### Dependencies

- **`npm audit` reports 5 high-severity findings.** They come from a single advisory ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), `braces` stack-exhaustion DoS) pulled in through `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. It only affects lint tooling at dev time and is not in the runtime bundle. No patched `braces` release exists yet. The `npm audit fix --force` suggestion would downgrade `eslint-config-next` to 14.x, so that fix was not applied.
- **TypeScript 7 and ESLint 10 were deliberately not adopted.** The project stays on the majors that `create-next-app@16.4.2` sets up and supports (TS 5.x, ESLint 9). ESLint 9.39 prints a "no longer supported" deprecation warning on install.
- **The `unrs-resolver` postinstall script is denied** (`allowScripts` in `package.json`). The script is only a fallback for fetching native binaries, and the prebuilt optional dependency already covers this.

## Time invested

_TBD_
