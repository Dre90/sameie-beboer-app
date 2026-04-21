# AGENTS.md

Instructions for AI agents working in this repository.

## Project overview

`sameie-beboer-app` is an app for residents of a housing cooperative. Stack:

- **React 19** + **TypeScript** (strict, `jsx: react-jsx`)
- **Tailwind CSS v4** via `@tailwindcss/vite` (imported in `src/style.css`)
- **shadcn/ui** on the **Base UI** primitive library (`base`, not `radix`). Config in `components.json`.
- **Vitest** (via Vite+) with `jsdom`, Testing Library, and `jest-dom` matchers
- **Vite+** (`vp`) as the unified toolchain
- Path alias `@/*` → `src/*` (configured in both `tsconfig.json` and `vite.config.ts`)

## Project structure

```
src/
  AppShell.tsx        # App layout shell
  main.tsx            # React entrypoint (ReactDOM.createRoot + RouterProvider)
  router.tsx          # react-router-dom routes
  style.css           # @import "tailwindcss" + shadcn theme tokens
  components/ui/      # shadcn/ui components (managed via shadcn CLI)
  lib/utils.ts        # `cn()` helper used by shadcn components
  features/           # Feature modules (e.g. `map/`)
  hooks/              # Shared hooks
  test/setup.ts       # import "@testing-library/jest-dom/vitest"
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

- `vp dev` — dev server
- `vp test` — tests (watch). `vp test --run` for a single run.
- `vp check` — format + lint + typecheck (run before commit). `vp check --fix` to auto-fix.
- `vp build` — production build

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

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, but it invokes Vite through `vp dev` and `vp build`.

## Vite+ Workflow

`vp` is a global binary that handles the full development lifecycle. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

### Start

- create - Create a new project from a template
- migrate - Migrate an existing project to Vite+
- config - Configure hooks and agent integration
- staged - Run linters on staged files
- install (`i`) - Install dependencies
- env - Manage Node.js versions

### Develop

- dev - Run the development server
- check - Run format, lint, and TypeScript type checks
- lint - Lint code
- fmt - Format code
- test - Run tests

### Execute

- run - Run monorepo tasks
- exec - Execute a command from local `node_modules/.bin`
- dlx - Execute a package binary without installing it as a dependency
- cache - Manage the task cache

### Build

- build - Build for production
- pack - Build libraries
- preview - Preview production build

### Manage Dependencies

Vite+ automatically detects and wraps the underlying package manager such as pnpm, npm, or Yarn through the `packageManager` field in `package.json` or package manager-specific lockfiles.

- add - Add packages to dependencies
- remove (`rm`, `un`, `uninstall`) - Remove packages from dependencies
- update (`up`) - Update packages to latest versions
- dedupe - Deduplicate dependencies
- outdated - Check for outdated packages
- list (`ls`) - List installed packages
- why (`explain`) - Show why a package is installed
- info (`view`, `show`) - View package information from the registry
- link (`ln`) / unlink - Manage local package links
- pm - Forward a command to the package manager

### Maintain

- upgrade - Update `vp` itself to the latest version

These commands map to their corresponding tools. For example, `vp dev --port 3000` runs Vite's dev server and works the same as Vite. `vp test` runs JavaScript tests through the bundled Vitest. The version of all tools can be checked using `vp --version`. This is useful when researching documentation, features, and bugs.

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm, npm, or Yarn directly. Vite+ can handle all package manager operations.
- **Always use Vite commands to run tools:** Don't attempt to run `vp vitest` or `vp oxlint`. They do not exist. Use `vp test` and `vp lint` instead.
- **Running scripts:** Vite+ built-in commands (`vp dev`, `vp build`, `vp test`, etc.) always run the Vite+ built-in tool, not any `package.json` script of the same name. To run a custom script that shares a name with a built-in command, use `vp run <script>`. For example, if you have a custom `dev` script that runs multiple services concurrently, run it with `vp run dev`, not `vp dev` (which always starts Vite's dev server).
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Use Vite+ wrappers for one-off binaries:** Use `vp dlx` instead of package-manager-specific `dlx`/`npx` commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## CI Integration

For GitHub Actions, consider using [`voidzero-dev/setup-vp`](https://github.com/voidzero-dev/setup-vp) to replace separate `actions/setup-node`, package-manager setup, cache, and install steps with a single action.

```yaml
- uses: voidzero-dev/setup-vp@v1
  with:
    cache: true
- run: vp check
- run: vp test
```

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.
<!--VITE PLUS END-->
