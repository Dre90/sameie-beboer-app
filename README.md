# sameie-beboer-app

App for residents of a housing cooperative (sameie). Built with React, TypeScript, Tailwind CSS, and Vitest — powered by [Vite+](https://vite.dev/).

## Tech stack

- **React 19** + **TypeScript** — UI and type safety
- **Tailwind CSS v4** — styling via `@tailwindcss/vite`
- **Vitest** (through Vite+) — unit tests with `jsdom` and Testing Library
- **Vite+** — unified toolchain for dev, build, lint, format, and test

## Getting started

Requires [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/). The Vite+ CLI (`vp`) is installed as part of dev-dependencies.

```bash
pnpm install
pnpm dev
```

The app runs at http://localhost:5173.

## Scripts

| Command        | Description                          |
| -------------- | ------------------------------------ |
| `pnpm dev`     | Start the dev server with HMR        |
| `pnpm build`   | Build for production into `dist/`    |
| `pnpm preview` | Preview the production build locally |
| `pnpm test`    | Run tests (watch mode)               |
| `pnpm check`   | Run format, lint, and type checks    |
| `pnpm lint`    | Lint only                            |
| `pnpm fmt`     | Format only                          |

Tip: run `pnpm check -- --fix` to auto-fix lint and formatting issues.

## Project structure

```
src/
  App.tsx           # Root component
  App.test.tsx      # Tests for App
  main.tsx          # React entrypoint
  style.css         # Tailwind import
  test/setup.ts     # Test setup (jest-dom matchers)
```

## Testing

Tests are written with [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) and run by Vitest through Vite+. Run once with:

```bash
pnpm test --run
```
