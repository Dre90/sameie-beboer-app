import { randomBytes, createHmac } from "node:crypto";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { getCookie, setCookie } from "hono/cookie";
import { stringify } from "csv-stringify/sync";
import { completionLabels, isCommentField, responseLabels } from "../src/lib/filter-types";
import type { Role } from "../src/lib/filter-types";
import { digest, verifyPassword } from "./password";
import type { Store } from "./store";
import { validateUpdate } from "./validation";

export type Settings = {
  boardHash: string;
  craftsmanHash: string;
  craftsmanAccessUntil: string;
  eventDate: string;
  local: boolean;
};

type Bindings = { store: Store; settings: Settings; ip: string };
type Variables = { role: Role };
export const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function credential(settings: Settings, role: Role) {
  return role === "board" ? settings.boardHash : settings.craftsmanHash;
}

function roleAvailable(settings: Settings, role: Role) {
  return role === "board" || Date.parse(settings.craftsmanAccessUntil) > Date.now();
}

app.use("*", async (context, next) => {
  context.header("Cache-Control", "private, no-store");
  context.header("X-Content-Type-Options", "nosniff");
  context.header("X-Robots-Tag", "noindex, nofollow");
  if (!["GET", "HEAD"].includes(context.req.method)) {
    if (context.req.header("Origin") !== new URL(context.req.url).origin) {
      throw new HTTPException(403, { message: "Ugyldig opprinnelse" });
    }
    if (context.req.header("Content-Type")?.split(";")[0] !== "application/json") {
      throw new HTTPException(415, { message: "JSON kreves" });
    }
  }
  await next();
});

app.onError((error, context) => {
  if (error instanceof HTTPException) return context.json({ error: error.message }, error.status);
  console.error("API request failed", error.name);
  return context.json({ error: "Serverfeil. Prøv igjen." }, 500);
});

app.post("/api/login", async (context) => {
  const { store, settings, ip } = context.env;
  if (!/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(settings.boardHash)) {
    throw new HTTPException(503, { message: "Innlogging er ikke konfigurert" });
  }
  const clientHash = createHmac("sha256", settings.boardHash).update(ip).digest("hex");
  if (!(await store.allowLogin(clientHash))) {
    context.header("Retry-After", "900");
    throw new HTTPException(429, {
      message: "For mange forsøk. Prøv igjen om 15 minutter.",
    });
  }
  const body = await readBody(context.req.raw);
  if (
    !body ||
    typeof body !== "object" ||
    !("password" in body) ||
    typeof body.password !== "string" ||
    body.password.length > 256
  ) {
    throw new HTTPException(400, { message: "Ugyldig passord" });
  }
  const [board, craftsman] = await Promise.all([
    verifyPassword(body.password, settings.boardHash),
    verifyPassword(body.password, settings.craftsmanHash),
  ]);
  if (board && craftsman) throw new HTTPException(503, { message: "Rollene må ha ulike passord" });
  const role = board ? "board" : craftsman ? "craftsman" : null;
  if (!role || !roleAvailable(settings, role)) {
    throw new HTTPException(401, {
      message: "Feil passord eller utløpt tilgang",
    });
  }
  const expires = new Date(
    Math.min(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
      role === "craftsman" ? Date.parse(settings.craftsmanAccessUntil) : Infinity,
    ),
  );
  const token = randomBytes(32).toString("hex");
  await store.createSession(digest(token), role, digest(credential(settings, role)), expires);
  setCookie(context, settings.local ? "filter_session" : "__Host-filter_session", token, {
    httpOnly: true,
    secure: !settings.local,
    sameSite: "Strict",
    path: "/",
    expires,
  });
  return context.json({ role });
});

app.use("/api/*", async (context, next) => {
  const { settings, store } = context.env;
  const token = getCookie(context, settings.local ? "filter_session" : "__Host-filter_session");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    throw new HTTPException(401, { message: "Logg inn for å fortsette" });
  }
  const session = await store.session(digest(token));
  if (
    !session ||
    session.credential_version !== digest(credential(settings, session.role)) ||
    !roleAvailable(settings, session.role)
  ) {
    throw new HTTPException(401, {
      message: "Tilgangen er utløpt. Logg inn igjen.",
    });
  }
  context.set("role", session.role);
  await next();
});

app.get("/api/session", (context) => context.json({ role: context.get("role") }));

app.post("/api/logout", async (context) => {
  const name = context.env.settings.local ? "filter_session" : "__Host-filter_session";
  await context.env.store.deleteSession(digest(getCookie(context, name)!));
  setCookie(context, name, "", {
    path: "/",
    httpOnly: true,
    secure: !context.env.settings.local,
    sameSite: "Strict",
    maxAge: 0,
  });
  return context.json({ ok: true });
});

app.get("/api/units", async (context) =>
  context.json({
    units: await context.env.store.list(),
    eventDate: context.env.settings.eventDate || null,
    fetchedAt: new Date().toISOString(),
  }),
);

app.get("/api/export", async (context) => {
  if (context.get("role") !== "board") {
    throw new HTTPException(403, { message: "Bare styret kan eksportere" });
  }
  const units = await context.env.store.list();
  const exportedAt = new Date().toISOString();
  const csv = stringify(
    units.map((unit) => ({
      Filterbyttedato: context.env.settings.eventDate,
      Eksportert: exportedAt,
      Leilighet: unit.id,
      Beboersvar: responseLabels[unit.response],
      Utførelse: completionLabels[unit.completion],
      SistEndret: unit.updated_at,
      KommentarStyret: unit.board_comment,
      BeskjedHåndverker: unit.craftsman_comment,
    })),
    { header: true, bom: true, delimiter: ";", escape_formulas: true },
  );
  context.header("Content-Type", "text/csv; charset=utf-8");
  context.header("Content-Disposition", 'attachment; filename="filterbytte.csv"');
  return context.body(csv);
});

app.patch("/api/units/:id/:field", async (context) => {
  const field = context.req.param("field");
  if (field !== "response" && field !== "completion" && !isCommentField(field)) {
    throw new HTTPException(404, { message: "Ukjent handling" });
  }
  const role = context.get("role");
  if (field === "response" && role !== "board") {
    throw new HTTPException(403, {
      message: "Bare styret kan endre beboersvar",
    });
  }
  if (field === "board_comment" && role !== "board") {
    throw new HTTPException(403, {
      message: "Bare styret kan skrive styrets kommentar",
    });
  }
  const body = await readBody(context.req.raw);
  let update;
  try {
    update = validateUpdate(context.req.param("id"), field, body);
  } catch {
    throw new HTTPException(400, {
      message: isCommentField(field)
        ? "Ugyldig leilighet, kommentar eller versjon"
        : "Ugyldig leilighet, status eller versjon",
    });
  }
  if (field === "craftsman_comment" && role === "board" && update.value !== "") {
    throw new HTTPException(403, {
      message: "Styret kan bare tømme håndverkerens beskjed",
    });
  }
  const unit = await context.env.store.update(
    context.req.param("id"),
    field,
    update.value,
    update.version,
  );
  if (!unit)
    throw new HTTPException(409, {
      message: "Leiligheten er endret av en annen. Hent ny status før du lagrer.",
    });
  return context.json({ unit });
});

app.notFound((context) => context.json({ error: "Ikke funnet" }, 404));

async function readBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > 2048) throw new HTTPException(413, { message: "Forespørselen er for stor" });
  try {
    return JSON.parse(text);
  } catch {
    throw new HTTPException(400, { message: "Ugyldig JSON" });
  }
}
