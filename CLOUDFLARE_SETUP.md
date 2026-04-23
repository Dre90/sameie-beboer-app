# Cloudflare Setup

Steg for å få auth + D1 opp å kjøre. Alle kommandoer kjøres fra repo-roten.

## 1. Opprett D1-database

```powershell
pnpm dlx wrangler d1 create sameie-beboer-app-db
```

Kopier `database_id` fra output og bytt ut `REPLACE_WITH_D1_DATABASE_ID` i
[`wrangler.jsonc`](wrangler.jsonc).

## 2. Kjør schema

```powershell
# Lokalt (for vp dev)
pnpm dlx wrangler d1 execute sameie-beboer-app-db --local --file=./worker/schema.sql

# Produksjon
pnpm dlx wrangler d1 execute sameie-beboer-app-db --remote --file=./worker/schema.sql
```

## 3. Seed første styremedlem

Uten en bruker i `users`-tabellen slipper ingen inn.

```powershell
pnpm dlx wrangler d1 execute sameie-beboer-app-db --remote --command="INSERT INTO users (email, name, role) VALUES ('din@email.no', 'Ditt Navn', 'board')"
```

## 4. Sett opp Cloudflare Access (Zero Trust)

I Cloudflare dashbord → **Zero Trust**:

1. Slå på Zero Trust (gratis opp til 50 brukere).
2. **Access → Applications → Add an application → Self-hosted**.
   - Application domain: `<din-worker>.workers.dev` eller egendomene.
   - Session duration: 24 timer (eller valgfritt).
3. **Policies → Add a policy**:
   - Name: `Sameie-beboere`
   - Action: `Allow`
   - Include: `Emails ending in` → f.eks. `@`-wildcard, eller `Everyone` (app-laget
     sjekker `users`-tabellen uansett).
4. **Identity providers**: aktiver **One-time PIN** (email OTP).
5. Lagre. Kopier **AUD**-taggen fra application overview.

## 5. Sett Worker-env

I dashbord → **Workers & Pages → (din worker) → Settings → Variables**:

- `ACCESS_TEAM_DOMAIN` = `<team-name>.cloudflareaccess.com`
- `ACCESS_AUD` = AUD-taggen fra steg 4.5

Eller via CLI:

```powershell
pnpm dlx wrangler secret put ACCESS_TEAM_DOMAIN
pnpm dlx wrangler secret put ACCESS_AUD
```

## 6. Lokal utvikling uten Access

`vp dev` har ingen Access foran seg. Sett i `.dev.vars` (opprett filen):

```
DEV_BYPASS_AUTH=true
DEV_USER_EMAIL=din@email.no
```

Brukeren må finnes i lokal D1 (kjør seed-kommandoen med `--local`).

## 7. Deploy

```powershell
pnpm build
pnpm dlx wrangler deploy
```
