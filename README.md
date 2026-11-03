# Filterbytte | Saksvik Øvre

Kart og arbeidsoversikt for én filterbyttedag, med 47 leiligheter. React 19, TypeScript, Tailwind og shadcn/Base UI på frontend. Vanlige Netlify Functions med Hono og Netlify Database (Postgres) på serveren. Verktøykjeden er Vite+ (`vp`).

Ingen personregister, e-post eller telefon. Beboersvar og utførelse er separate felt. Styret endrer svar og eksporterer reserveoversikt. Begge roller kan markere utført/levert og angre med bekreftelse. Dette er ikke en adgangskontroll: markeringen «Samtykke» er ikke i seg selv dokumentasjon på tillatelse til å gå inn.

Hver leilighet har to kommentarfelt på maks 500 tegn. Styret skriver «Kommentar fra styret», og håndverkeren skriver «Beskjed til styret». Hver rolle endrer bare sitt eget felt og ser det andre som lesetekst. Styret kan tømme håndverkerens beskjed etter bekreftelse, men ikke endre den. Feltene er appens eneste fritekst og skal bare brukes til praktisk info, for eksempel «Hund i bur». Ikke skriv navn, telefonnummer, helseopplysninger eller samtykkedokumentasjon der. Leiligheter med kommentar har en prikk i kartet og et ikon i lista.

Store leiligheter (B16–B19, B25–B28 og B31–B36) er tegnet større i kartet, så håndverkeren kan ta med riktig filter. B-blokka og rekkehusene slutter på samme høyrekant, som i oversiktsplanen.

## Lokal utvikling

Krever Node 24.15 eller nyere i Node 24-serien, Vite+ og en Netlify-konto med tilgang til det eksisterende prosjektet `saksvik-ovre`.

```bash
vp install
vp exec netlify login
vp exec netlify link --name saksvik-ovre
vp exec node scripts/setup-local.ts
vp run dev
```

Oppsettsskriptet lager tilfeldige lokale passord i `.secrets/local-passwords.json` og hashverdier i `.env`. Begge er git-ignorert, med private filrettigheter. Det nekter å overskrive eksisterende filer. `--demo` lager kjente passord kun for lokal testing: `local-board-only` og `local-craftsman-only`. Disse må aldri brukes i produksjon.

Mens serveren kjører, bruk en annen terminal:

```bash
vp exec netlify database migrations apply
```

Åpne http://localhost:8888. Databasen er lokal og starter med tomme svar. `vp dev` alene starter bare Vite og gir ikke et fungerende API. Produksjonens CSP genereres i `dist/_headers`; lokal Netlify bruker `public` og inkluderer ikke denne filen.

Netlify CLI 27.6 har en lokal proxyfeil: en 403 fra en Function kan bli til 404 etter at proxyen prøver HTML-varianter av adressen. Autorisasjonen avviser fortsatt forespørselen. Integrasjonstestene kontrollerer API-ets faktiske 403; verifiser også avvisning på publisert HTTPS-adresse. Versjonskonflikter bruker 409 og berøres ikke.

## Kontroller

```bash
vp check
vp test --run --coverage
vp build
```

Dette er lokale kommandoer, ikke publisering. Tester bruker isolerte lokale databaser, ikke produksjon. Testene ligger ved komponentene og importerer fra `vite-plus/test`. Se [AGENTS.md](AGENTS.md).

## Universell utforming

Teknisk gjennomgang 15. september 2026, med axe-core i Chromium, komponenttester og manuell kontroll av DOM, kontrast og layout. Dette er ikke en full WCAG-sertifisering.

- Valgt kartleilighet markeres med en kontrasterende kant som beholder tykkelsen ved zoom. Statusfargen beholdes og oppdateres også mens leiligheten er valgt. Tekstkontur skjermer alle etiketter fra stripemønster og statusfarger.
- Kartleiligheter har tastaturfokus, Enter/mellomrom, opplest leilighetsnummer/status og valgt-tilstand. Store leiligheter og leiligheter med kommentar leses også opp som «stor leilighet» og «har kommentar». Listen er et alternativ til presise trykk i kartet; status finnes også som tekst i detaljpanelet.
- Andre etasjer markeres med stiplet kant, ikke lav tekstkontrast. Primærknapper og feilmeldinger beholder kontrast ved hover og feil.
- Knapper med kant, statusmerker, svarvalg og tekstfelt har kant med minst 3:1 kontrast (tokenet `--control-border`) i lyst og mørkt tema. Valgt svar fylles med primærfargen, også ved hover. I mørkt tema får valgt svar i tillegg en lys kant, fordi primærfargen alene er under 3:1 mot bakgrunnen.
- Fokusmarkering, norske lukkenavn, navngitte fanelister/zoomgrupper, overskrifter og hovedområde er kontrollert. Mobilens liste-til-detaljflyt har test for fokusretur ved lukking.
- Axe fant ingen gjenværende automatiske brudd i de sjekkede visningene: innlogging, tilkoblingsfeil, oversikt/detaljer på desktop, nettbrett og mobil, samt ferdigrendret mørkt tema. Begge roller er også dekket av komponentbaserte axe-tester.
- 320 px mobilbredde og 200 % tekststørrelse er kontrollert uten horisontal overflyt eller klipping av knappetekst i de sjekkede tilstandene.

`vp test --run --coverage` inkluderer UU-regresjonstestene. jsdom beregner ikke pålitelig visuell kontrast; denne regelen er derfor bare slått av i komponenttestene og kontrollert separat i nettleseren. Axe kan heller ikke avgjøre alle SVG-kontraster, og automatisering erstatter ikke skjermlesertesting.

Før publisering: gjør en praktisk gjennomgang med VoiceOver/Safari på fysisk iPad og iPhone, tastatur uten mus, 200 % nettleserzoom og høy kontrast. Kontroller spesielt fokus etter etasjebytte, zoom/panorering, feilmeldinger og bekreftelsesdialoger.

## Pakkeoppgraderinger

Kompatibilitet kontrollert 15. september 2026 mot npm-metadata, typekontroll, tester og produksjonsbygg:

- React og React DOM oppgraderes sammen til 19.3, med tilhørende 19.3-typer.
- Vite+ og den overstyrte Vite-kjernen er låst til 0.3.2 i `pnpm-workspace.yaml`. Vitest leveres av Vite+; den gamle `@voidzero-dev/vite-plus-test`-overstyringen er fjernet.
- `@vitest/coverage-v8` er låst til 4.1.11 for å matche testmotoren. Nyeste hovedversjon 5 er ikke kompatibel med denne Vite+-versjonen.
- `@types/node` følger Node 24, ikke nyeste Node 26. jsdom 30 krever minst Node 24.15 i denne serien.
- TypeScript 7 er kontrollert med eksisterende strenge innstillinger og ES2023-mål. Ingen endring i nettlesermålet.
- Ubrukte direkte avhengigheter `radix-ui` og `zustand` er fjernet. Base UI brukes fortsatt, og lokal shadcn-komponentkode beholdes med appens tilpasninger.
- Netlify-pakkene er allerede på nyeste publiserte versjon. CLI 27.6 har interne peer-advarsler for Blobs og OpenTelemetry; ingen tvungne underavhengigheter er lagt til for å skjule disse.

Lasting, lagring og konfliktvern er samlet i `src/features/filter-day/hooks/useFilterDay.ts`, adskilt fra kartvisningen. Hooken testes både direkte og gjennom brukerflytene.

## Før publisering

1. Avklar faktisk filterbyttedato og sluttidspunkt for håndverkertilgang, inkludert tidssone.
2. Bekreft Netlify-plan, tilgjengelige kreditter, Database-støtte, databehandleravtale og valgt database-/funksjonsregion. Ikke legg inn reelle svar før dette er vurdert.
3. Opprett to ulike, lange tilfeldige produksjonspassord. Hashformatet er `scrypt$salt$key` med N=32768, r=8, p=3, 16-byte salt og 32-byte nøkkel, implementert i [server/password.ts](server/password.ts). Ikke legg passord eller hashverdier i Git eller chat.
4. Sett miljøvariablene nedenfor direkte i Netlify med Functions-scope og riktig deploy-kontekst. Ikke importer lokal `.env` til produksjon.
5. Bygget bruker `vp build`, publiserer `dist` og pakker Functions fra `netlify/functions`. Databasepakken gjør at Netlify oppretter database og anvender migrasjoner ved godkjent deploy. Dette krever en støttet kredittbasert plan og kan bruke kreditter.
6. Publiser kun etter uttrykkelig godkjenning. Git-push til tilkoblet produksjonsgren kan utløse bygg. Lokal commit gjør ikke det. Ikke opprett nytt Netlify-prosjekt.
7. Verifiser innlogging for begge roller, 47 leiligheter, lagring, konflikt, utlogging, reserveeksport og tilgangsstenging på den publiserte HTTPS-adressen før bruk.

| Variabel                  | Verdi                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `BOARD_PASSWORD_HASH`     | Scrypt-hash for styret, obligatorisk                                                                 |
| `CRAFTSMAN_PASSWORD_HASH` | Annen scrypt-hash for håndverker                                                                     |
| `CRAFTSMAN_ACCESS_UNTIL`  | ISO-tidspunkt med tidssone, for eksempel `2026-10-01T18:00:00+02:00`; eksemplet er ikke vedtatt dato |
| `FILTER_EVENT_DATE`       | `YYYY-MM-DD`; datoen vises i kartet og eksporten                                                     |

Manglende/utløpt håndverkerfrist stenger håndverkeren. Manglende styrehash stenger innlogging. Netlify injiserer databasetilkobling automatisk. Ingen hemmeligheter skal ha `VITE_`-prefiks. Miljøendringer i Functions krever ny deploy; bytte av passordhash ugyldiggjør eksisterende sesjoner ved neste API-kall i den nye deployen.

Deploy previews kan inneholde en kopi av produksjonsdata. Bruk separate testpassord, beskytt forhåndsvisninger og ikke del lenker ukritisk. Gamle deploy-adresser kan ha gamle miljøvariabler; begrens tilgangen og rydd gamle deployer ved passordrotasjon.

## På filterbyttedagen

- Del rollepassord kun med rette mottakere, gjennom en separat sikker kanal. Delte roller gir ikke sporbarhet til enkeltpersoner.
- Sesjoner lagres server-side med hash av tilfeldig token. Nettleseren får HttpOnly, Secure, SameSite=Strict-cookie, maksimalt syv dager. Håndverkerfrist sjekkes ved hvert API-kall. Ingen passord lagres i nettleseren.
- Innlogging begrenses til ti forsøk per IP per 15 minutter, også vellykkede forsøk. Flere på samme nett deler grensen. API-et kontrollerer rolle, opprinnelse, JSON, tillatte statuser, kommentarlengde og versjon på serveren.
- Oversikten hentes ved åpning, manuelt og etter lagring. Ingen polling eller frakoblet lagring. Ved versjonskonflikt eller usikkert lagringsresultat må fersk status hentes før neste endring.
- Styret laster ned CSV-reserveoversikt før oppstart og ved avtalte pauser. Den inneholder tidspunkt og begge kommentarfeltene i egne kolonner (`KommentarStyret` og `BeskjedHåndverker`), og kan åpnes og skrives ut fra regneark. Eksporten er et øyeblikksbilde, ikke automatisk sikkerhetskopi eller gjenopprettingsformat.
- Ved driftsstans: avtal én ansvarlig papir-/reserveoversikt. Ikke anta at nettverksfeil betyr at endringen ikke ble lagret. Hent status og avstem manuelt før registrering gjenopptas.
- Følg Netlify-forbruk i kontrollpanelet og aktiver tilgjengelige varsler. Databasekjøring, trafikk og deployer kan bruke kreditter. Utsolgt kvote kan stoppe tjenesten; ikke stol på et gammelt prisestimat. Ingen betalt oppgradering uten godkjenning.

## Personvern og avslutning

Leilighetsnummer koblet til hjemme-/samtykkestatus er fortsatt personopplysninger. Det samme gjelder kommentarene, også når de bare inneholder praktisk info. Styret må fastsette behandlingsgrunnlag, informasjon til beboerne og hva de fire svarene konkret betyr. Behold nødvendig samtykkedokumentasjon i eksisterende, godkjent kanal, ikke i kommentarfeltene. Styret følger opp at feltene bare brukes til praktisk info, og tømmer tekst som ikke hører hjemme der.

Fastsett slettedato og ansvarlig før bruk. Appen har ikke automatisk sletting: etter avsluttet arbeid stenges håndverkertilgangen, CSV/papirkopier (som også inneholder kommentarene) slettes etter vedtatt frist, og statusdata og begge kommentarfeltene slettes/nullstilles gjennom en separat godkjent datamigrasjon eller av eier i kontrollpanelet. Inkluder sesjoner, innloggingsforsøk, deploy previews, snapshots, Netlify-backuper og tilgangslogger i vurderingen. Bevaringstider i leverandørens backuper må avklares med Netlify.

Innloggingsbegrensningen lagrer HMAC av IP, ikke rå IP. Utløpte telleverk og sesjoner ryddes ved senere innlogging, ikke av en tidsstyrt jobb. De kan derfor ligge igjen når appen ikke brukes. Netlify kan ha egne tekniske logger. Ikke logg passord, cookies eller forespørselskropper.

## Struktur

- `src/features/auth`: passordskjerm og sesjonskontekst.
- `src/features/filter-day`: filterbytteflyt og statuspanel.
- `src/features/map`: kart, geometri og statiske leilighetsnumre.
- `server`: autorisasjon, validering, databaseoperasjoner og integrasjonstester.
- `netlify/functions`: moderne Functions-ruter for API og innlogging.
- `netlify/database/migrations`: versjonert SQL. Aldri endre en anvendt migrasjon; legg til en ny.
- `scripts/setup-local.ts`: lokalt oppsett, aldri produksjonsoppsett.
