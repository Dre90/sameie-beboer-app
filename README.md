# sameie-beboer-app

App for residents of a housing cooperative (sameie). Built with React 19 + TypeScript, styled with Tailwind CSS and shadcn/ui on Base UI primitives, and tested with Vitest — all orchestrated by [Vite+](https://vite.dev/) (`vp`).

## Tech stack

- **React 19** + **TypeScript** (strict, `jsx: react-jsx`)
- **Tailwind CSS v4** via `@tailwindcss/vite`, theme tokens in `src/style.css`
- **shadcn/ui** on the **Base UI** primitive library (`base`, not Radix)
- **react-router-dom** for routing
- **Vitest** (through Vite+) with `jsdom` + Testing Library + `jest-dom`
- **Vite+** (`vp`) — unified toolchain for dev, build, lint, format, and test

## Getting started

Requires [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/). The Vite+ CLI (`vp`) is installed as a dev-dependency.

```bash
vp install
vp dev
```

The app runs at http://localhost:5173.

## Commands

Always use `vp` directly — it wraps the package manager, Vite, Vitest, Oxlint, Oxfmt, and tsdown.

| Command              | Description                                   |
| -------------------- | --------------------------------------------- |
| `vp dev`             | Start the dev server with HMR                 |
| `vp build`           | Build for production into `dist/`             |
| `vp preview`         | Preview the production build locally          |
| `vp test`            | Run tests (watch). Add `--run` for single run |
| `vp test --coverage` | Run tests with coverage                       |
| `vp check`           | Run format, lint, and type checks             |
| `vp check --fix`     | Auto-fix lint and formatting issues           |
| `vp lint` / `vp fmt` | Lint or format only                           |

Don't install `vite`, `vitest`, `oxlint`, `oxfmt`, or `tsdown` directly — Vite+ wraps them. Use `vp add/remove` for dependencies and `vp dlx <pkg>` for one-off binaries (e.g. `vp dlx shadcn@latest add button`).

## Project structure

```
src/
  AppShell.tsx        # App layout shell (header, outlet)
  main.tsx            # React entrypoint (RouterProvider)
  router.tsx          # react-router-dom routes
  style.css           # Tailwind import + shadcn theme tokens
  components/ui/      # shadcn/ui components (managed via shadcn CLI)
  lib/utils.ts        # `cn()` helper
  features/           # Feature modules, each with:
                      #   <feature>/
                      #     index.ts        barrel, exports the feature entry
                      #     <Feature>.tsx   feature entry/container
                      #     components/     presentational components (+ *.test.tsx)
                      #     lib/            pure TS helpers (+ *.test.ts)
                      #     data/           static data / fixtures
                      #     hooks/          feature-local hooks (if any)
  hooks/              # Shared hooks
  test/setup.ts       # @testing-library/jest-dom matchers
components.json       # shadcn config (base="base", aliases)
vite.config.ts        # plugins, @/ alias, test config
tsconfig.json         # paths, test-globals types
AGENTS.md             # Instructions for AI agents
```

The `@/*` path alias maps to `src/*` and is configured in both `tsconfig.json` and `vite.config.ts`.

## Testing

Tests live next to the module as `*.test.tsx` / `*.test.ts`. Import test utilities from `vite-plus/test` (not `vitest`):

```ts
import { expect, test, vi } from "vite-plus/test";
```

Run once with:

```bash
vp test --run
```

See [AGENTS.md](./AGENTS.md) for full conventions, commit format (Conventional Commits) and the shadcn workflow.
