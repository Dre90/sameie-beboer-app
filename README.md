# sameie-beboer-app

App for beboere i sameie. Bygget med React, TypeScript, Tailwind CSS og Vitest – drevet av [Vite+](https://vite.dev/).

## Teknologi

- **React 19** + **TypeScript** – UI og typesikkerhet
- **Tailwind CSS v4** – styling via `@tailwindcss/vite`
- **Vitest** (gjennom Vite+) – enhetstester med `jsdom` og Testing Library
- **Vite+** – samlet toolchain for dev, build, lint, format og test

## Kom i gang

Krever [Node.js](https://nodejs.org/) og [pnpm](https://pnpm.io/). Vite+ CLI installeres som del av dev-dependencies (`vp`).

```bash
pnpm install
pnpm dev
```

Appen kjører på http://localhost:5173.

## Skript

| Kommando       | Beskrivelse                            |
| -------------- | -------------------------------------- |
| `pnpm dev`     | Starter dev-server med HMR             |
| `pnpm build`   | Bygger produksjonsversjon til `dist/`  |
| `pnpm preview` | Forhåndsviser produksjonsbygget lokalt |
| `pnpm test`    | Kjører tester (watch-modus)            |
| `pnpm check`   | Kjører format-, lint- og typesjekk     |
| `pnpm lint`    | Kun lint                               |
| `pnpm fmt`     | Kun formatering                        |

Tips: kjør `pnpm check -- --fix` for å auto-rette lint- og formatfeil.

## Prosjektstruktur

```
src/
  App.tsx           # Rot-komponent
  App.test.tsx      # Tester for App
  main.tsx          # React-entrypoint
  style.css         # Tailwind-import
  test/setup.ts     # Test-setup (jest-dom matchere)
```

## Testing

Tester skrives med [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) og kjøres av Vitest via Vite+. Kjør én gang med:

```bash
pnpm test --run
```
