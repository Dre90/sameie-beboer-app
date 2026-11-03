# AGENTS.md

Instructions for AI agents working in this repository.

## Project overview

`sameie-beboer-app` tracks one filter-change day for 47 units at Saksvik Øvre. There is no people register. Board edits resident responses; both board and craftsman update separate completion statuses. Each role also writes its own short comment per unit (`board_comment` / `craftsman_comment`, max 500 characters, practical info only); the board may clear, but not edit, the craftsman's message. Stack:

- **React 19** + **TypeScript** (strict, `jsx: react-jsx`)
- **Tailwind CSS v4** via `@tailwindcss/vite` (imported in `src/style.css`)
- **shadcn/ui** on the **Base UI** primitive library (`base`, not `radix`). Config in `components.json`.
- **Vitest** (via Vite+) with `jsdom`, Testing Library, and `jest-dom` matchers
- **Vite+** (`vp`) as the unified toolchain
- **Netlify Functions** (modern Request/Response API, Hono) and **Netlify Database** (Postgres)
- Path alias `@/*` → `src/*` (configured in both `tsconfig.json` and `vite.config.ts`)

## Project structure

```
src/
  App.tsx             # AuthProvider + RequireAuth + FilterDay
  main.tsx            # React entrypoint
  style.css           # @import "tailwindcss" + shadcn theme tokens
  components/ui/      # shadcn/ui components (managed via shadcn CLI)
  lib/utils.ts        # `cn()` helper used by shadcn components
  features/           # Feature modules. Each feature follows:
                      #   <feature>/
                      #     index.ts          # barrel, exports the feature entry
                      #     <Feature>.tsx     # feature entry/container
                      #     components/       # presentational components (+ *.test.tsx)
                      #     lib/              # pure TS helpers (+ *.test.ts)
                      #     data/             # static data / fixtures
                      #     hooks/            # feature-local hooks (if any)
  hooks/              # Shared hooks
  test/setup.ts       # import "@testing-library/jest-dom/vitest"
server/               # Auth, versioned updates, SQL store and integration tests
netlify/functions/    # API and rate-limited login handlers
netlify/database/migrations/ # Timestamped SQL migrations
components.json       # shadcn config (style, base="base", aliases)
vite.config.ts        # plugins, `@` alias, test config with jsdom + setupFiles
tsconfig.json         # jsx: react-jsx, `@/*` path alias, test-globals types
.agents/skills/shadcn # shadcn Skill docs loaded by agents working with UI
```

## Conventions

- Use functional React components and hooks. Use named exports (e.g. `export function App()`).
- Styling is done with Tailwind utility classes directly in JSX. Do not create separate CSS files unless necessary.
- Use semantic color tokens (`bg-background`, `text-muted-foreground`, `border-border`, …) — **not** raw Tailwind colors like `bg-white` or `dark:bg-slate-900`. Theme is defined in `src/style.css`.
- Prefer existing shadcn/ui components over custom markup (see the shadcn Skill for the full rule set, including `FieldGroup` for forms, `ToggleGroup` for option sets, `Alert` for callouts, etc.).
- Add shadcn components with `vp dlx shadcn@latest add <name>`. Do **not** fetch component source manually. The project uses the **Base UI** base (`render` prop for custom triggers, not `asChild`).
- Import UI components from `@/components/ui/...` and utils from `@/lib/utils`. Prefer the `@/` alias over long relative paths.
- Import a feature from its barrel (e.g. `@/features/map`), not from its internal files, when consuming it from outside the feature.
- Test files live next to the module as `*.test.tsx` / `*.test.ts`.
- Import test utilities from `vite-plus/test` (not from `vitest`): `import { expect, test, vi } from "vite-plus/test"`.
- Use `@testing-library/react` + `@testing-library/user-event` for component tests.

## Testing policy

**Write tests for everything.** The goal is as close to 100% test coverage as practical.

- Every new component, hook, helper or bug fix must ship with tests in the same PR/commit.
- Prefer behavioural tests via Testing Library (simulate what the user does) over implementation details.
- Pure logic (data/geometry/utilities) should have direct unit tests.
- Run `vp test --run --coverage` to check coverage; address uncovered branches before committing.
- If something is genuinely untestable (e.g. a trivial icon-only component), note why in the PR description rather than silently skip.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) for **all** commits.

Format: `<type>(<optional scope>): <description>`

Common types:

- `feat` — a new feature
- `fix` — a bug fix
- `docs` — documentation only
- `style` — formatting / whitespace (no code change)
- `refactor` — code change that neither fixes a bug nor adds a feature
- `perf` — performance improvement
- `test` — adding or updating tests
- `build` — build system or dependency changes
- `ci` — CI configuration changes
- `chore` — other maintenance

Examples:

- `feat(auth): add login form`
- `fix(router): handle missing trailing slash`
- `docs: translate README to English`
- `chore(deps): bump react to 19.2.5`

Use `!` after the type/scope or a `BREAKING CHANGE:` footer to mark breaking changes.

## Workflow

Always run via Vite+ (`vp ...`). See the Vite+ section below for details.

- `vp run dev` — full local Netlify server, Functions and database; use port 8888
- `vp dev` — frontend only; no API
- `vp test` — tests (watch). `vp test --run` for a single run.
- `vp check` — format + lint + typecheck (run before commit). `vp check --fix` to auto-fix.
- `vp build` — production build

Read README.md before operational changes. Use installed official Netlify skills for database/functions/deploy work. Local migrations require `vp exec netlify database migrations apply` while the local server runs. Never edit an applied migration. Shared passwords, session hashes and connection strings must stay out of Git and logs. Do not commit, push, deploy, provision paid resources or change remote data without explicit approval. No polling or offline writes; preserve server-side role checks and optimistic version checks.

## Agent checklist

- [ ] Read relevant files before making changes (especially `vite.config.ts` and `tsconfig.json`).
- [ ] Run `vp check` and `vp test` after changes.
- [ ] Write tests for every new component, hook, helper or bug fix (aim for ~100% coverage).
- [ ] Use [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages.
- [ ] Do not install `vite`, `vitest`, `oxlint`, `oxfmt`, or `tsdown` directly — they are wrapped by Vite+.
- [ ] Do not edit `package.json` scripts to duplicate Vite+'s built-in commands (e.g. do not add `tsc` before `vp build` — typechecking is handled by `vp check`).
- [ ] When adding UI, use shadcn components (via `vp dlx shadcn@latest add`) before writing custom markup. Follow the rules in `.agents/skills/shadcn/SKILL.md`.

---

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
