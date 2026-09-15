// @vitest-environment node
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vite-plus/test";
import { NetlifyDB } from "@netlify/database-dev";
import { getDatabase } from "@netlify/database";
import { app, type Settings } from "./app";
import { createStore } from "./store";
import { digest, hashPassword, verifyPassword } from "./password";
import { allUnits } from "../src/features/map/data/units";

const local = new NetlifyDB();
let database: ReturnType<typeof getDatabase>;
let store: ReturnType<typeof createStore>;
let settings: Settings;
let boardCookie: string;
let craftsmanCookie: string;

function request(
  path: string,
  method = "GET",
  body?: unknown,
  cookie?: string,
  origin = "https://test.local",
) {
  return app.request(
    `https://test.local/api${path}`,
    {
      method,
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    { store, settings, ip: "127.0.0.1" },
  );
}

beforeAll(async () => {
  const connectionString = await local.start();
  await local.applyMigrations("./netlify/database/migrations");
  database = getDatabase({ connectionString });
  store = createStore(database);
  settings = {
    boardHash: await hashPassword("test-board-password"),
    craftsmanHash: await hashPassword("test-craftsman-password"),
    craftsmanAccessUntil: "2099-01-01T00:00:00Z",
    eventDate: "2026-10-01",
    local: false,
  };
}, 30000);

beforeEach(async () => {
  await database.sql`TRUNCATE sessions, login_attempts`;
  await database.sql`UPDATE unit_status SET response = 'unanswered', completion = 'pending', version = 0`;
  await store.createSession(
    digest("a".repeat(64)),
    "board",
    digest(settings.boardHash),
    new Date(Date.now() + 60000),
  );
  await store.createSession(
    digest("b".repeat(64)),
    "craftsman",
    digest(settings.craftsmanHash),
    new Date(Date.now() + 60000),
  );
  boardCookie = `__Host-filter_session=${"a".repeat(64)}`;
  craftsmanCookie = `__Host-filter_session=${"b".repeat(64)}`;
});

afterAll(async () => {
  await database?.pool.end();
  await local.stop();
});

test("migration seeds exactly the 47 map units without personal data", async () => {
  const result = await request("/units", "GET", undefined, boardCookie);
  const body = await result.json();
  expect(body.units.map((unit: { id: string }) => unit.id).sort()).toEqual(
    allUnits.map((unit) => unit.id).sort(),
  );
  expect(Object.keys(body.units[0]).sort()).toEqual([
    "completion",
    "id",
    "response",
    "updated_at",
    "version",
  ]);
  expect(body.eventDate).toBe("2026-10-01");
  expect(body.units[0].updated_at).toBe(new Date(body.units[0].updated_at).toISOString());
  expect(result.headers.get("cache-control")).toContain("no-store");
});

test("all data requires a valid session", async () => {
  expect((await request("/units")).status).toBe(401);
  expect(
    (
      await request("/units/B24/response", "PATCH", {
        response: "home",
        version: 0,
      })
    ).status,
  ).toBe(401);
  expect((await request("/session", "GET", undefined, "__Host-filter_session=forged")).status).toBe(
    401,
  );
  expect(
    (await request("/session", "GET", undefined, `__Host-filter_session=${"c".repeat(64)}`)).status,
  ).toBe(401);
});

test("board updates responses; craftsman can only complete and undo", async () => {
  expect(
    (
      await request(
        "/units/B24/response",
        "PATCH",
        { response: "home", version: 0 },
        craftsmanCookie,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await request(
        "/units/B24/response",
        "PATCH",
        { response: "consent", version: 0 },
        boardCookie,
      )
    ).status,
  ).toBe(200);
  const completed = await request(
    "/units/B24/completion",
    "PATCH",
    { completion: "performed", version: 1 },
    craftsmanCookie,
  );
  const completedUnit = (await completed.json()).unit;
  expect(completedUnit.updated_at).toBe(new Date(completedUnit.updated_at).toISOString());
  expect(completedUnit).toMatchObject({
    response: "consent",
    completion: "performed",
    version: 2,
  });
  expect(
    (
      await request(
        "/units/B24/completion",
        "PATCH",
        { completion: "pending", version: 2 },
        craftsmanCookie,
      )
    ).status,
  ).toBe(200);
});

test("atomic version check rejects a simultaneous update without overwriting", async () => {
  const results = await Promise.all([
    request("/units/B24/response", "PATCH", { response: "home", version: 0 }, boardCookie),
    request("/units/B24/response", "PATCH", { response: "consent", version: 0 }, boardCookie),
  ]);
  expect(results.map((result) => result.status).sort((first, second) => first - second)).toEqual([
    200, 409,
  ]);
});

test("validates writes and blocks cross-origin requests", async () => {
  expect(
    (await request("/units/B99/response", "PATCH", { response: "home", version: 0 }, boardCookie))
      .status,
  ).toBe(400);
  expect(
    (
      await request(
        "/units/B24/response",
        "PATCH",
        { response: "home", version: 0, role: "board" },
        boardCookie,
      )
    ).status,
  ).toBe(400);
  expect((await request("/units/B24/role", "PATCH", {}, boardCookie)).status).toBe(404);
  expect((await request("/logout", "POST", {}, boardCookie, "https://evil.local")).status).toBe(
    403,
  );
  const wrongType = await app.request(
    "https://test.local/api/login",
    { method: "POST", headers: { Origin: "https://test.local" } },
    { store, settings, ip: "ip" },
  );
  expect(wrongType.status).toBe(415);
});

test("password login sets secure cookie and logout revokes server session", async () => {
  const login = await request("/login", "POST", {
    password: "test-board-password",
  });
  expect(login.status).toBe(200);
  expect(await login.json()).toEqual({ role: "board" });
  const cookie = login.headers.get("set-cookie")!;
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("Secure");
  expect(cookie).toContain("SameSite=Strict");
  expect((await request("/session", "GET", undefined, cookie)).status).toBe(200);
  expect((await request("/logout", "POST", {}, cookie)).status).toBe(200);
  expect((await request("/session", "GET", undefined, cookie)).status).toBe(401);
  expect((await request("/login", "POST", { password: "wrong" })).status).toBe(401);
});

test("craftsman login and cutoff, expired sessions and password rotation", async () => {
  const login = await request("/login", "POST", {
    password: "test-craftsman-password",
  });
  expect(await login.json()).toEqual({ role: "craftsman" });
  const oldUntil = settings.craftsmanAccessUntil;
  settings.craftsmanAccessUntil = "2000-01-01T00:00:00Z";
  expect((await request("/session", "GET", undefined, craftsmanCookie)).status).toBe(401);
  expect((await request("/login", "POST", { password: "test-craftsman-password" })).status).toBe(
    401,
  );
  settings.craftsmanAccessUntil = oldUntil;
  await database.sql`UPDATE sessions SET credential_version = 'revoked' WHERE role = 'board'`;
  expect((await request("/session", "GET", undefined, boardCookie)).status).toBe(401);
  await database.sql`UPDATE sessions SET expires_at = now() - interval '1 second'`;
  expect((await request("/session", "GET", undefined, craftsmanCookie)).status).toBe(401);
});

test("login attempts are limited atomically and expired attempts are cleaned up", async () => {
  for (let attempt = 0; attempt < 10; attempt++)
    expect(await store.allowLogin("client")).toBe(true);
  expect(await store.allowLogin("client")).toBe(false);
  await database.sql`UPDATE login_attempts SET expires_at = now() - interval '1 second'`;
  expect(await store.allowLogin("client")).toBe(true);
  const key = (await import("node:crypto"))
    .createHmac("sha256", settings.boardHash)
    .update("127.0.0.1")
    .digest("hex");
  for (let attempt = 0; attempt < 10; attempt++) await store.allowLogin(key);
  expect((await request("/login", "POST", { password: "wrong" })).status).toBe(429);
});

test("password helpers reject malformed hashes", async () => {
  expect(await verifyPassword("password", "bad hash")).toBe(false);
});

test("only board can export fresh status with date and no personal fields", async () => {
  expect((await request("/export")).status).toBe(401);
  expect((await request("/export", "GET", undefined, craftsmanCookie)).status).toBe(403);
  await store.update("B24", "response", "consent", 0);
  const response = await request("/export", "GET", undefined, boardCookie);
  expect(response.headers.get("content-disposition")).toContain("attachment");
  expect(response.headers.get("cache-control")).toContain("no-store");
  const csv = await response.text();
  expect(csv).toContain("Leilighet;Beboersvar;Utførelse;SistEndret");
  expect(csv).toContain("B24;Samtykke;Ikke utført");
  expect(csv).toContain("2026-10-01");
  expect(csv.trim().split("\n")).toHaveLength(48);
});

test("malformed input and missing or ambiguous credentials fail closed", async () => {
  expect((await request("/login", "POST", { password: 123 })).status).toBe(400);
  expect((await request("/login", "POST", { password: "x".repeat(3000) })).status).toBe(413);
  const malformed = await app.request(
    "https://test.local/api/login",
    {
      method: "POST",
      headers: {
        Origin: "https://test.local",
        "Content-Type": "application/json",
      },
      body: "{",
    },
    { store, settings, ip: "ip" },
  );
  expect(malformed.status).toBe(400);
  for (const override of [{ boardHash: "" }, { craftsmanHash: settings.boardHash }]) {
    const response = await app.request(
      "https://test.local/api/login",
      {
        method: "POST",
        headers: {
          Origin: "https://test.local",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: "test-board-password" }),
      },
      { store, settings: { ...settings, ...override }, ip: "ip" },
    );
    expect(response.status).toBe(503);
  }
  expect((await request("/unknown", "GET", undefined, boardCookie)).status).toBe(404);
});

test("local cookies work without HTTPS and missing date stays empty", async () => {
  const env = {
    store,
    settings: { ...settings, local: true, eventDate: "" },
    ip: "local",
  };
  const login = await app.request(
    "http://localhost/api/login",
    {
      method: "POST",
      headers: {
        Origin: "http://localhost",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: "test-board-password" }),
    },
    env,
  );
  const cookie = login.headers.get("set-cookie")!;
  expect(cookie).toMatch(/^filter_session=/);
  expect(cookie).not.toContain("Secure");
  const overview = await app.request(
    "http://localhost/api/units",
    { headers: { Cookie: cookie } },
    env,
  );
  expect((await overview.json()).eventDate).toBeNull();
});

test("database errors return no internal details", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const brokenStore = {
    ...store,
    list: async () => {
      throw new Error("private database detail");
    },
  };
  try {
    const response = await app.request(
      "https://test.local/api/units",
      { headers: { Cookie: boardCookie } },
      { store: brokenStore, settings, ip: "ip" },
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Serverfeil. Prøv igjen." });
    expect(response.headers.get("cache-control")).toContain("no-store");
  } finally {
    log.mockRestore();
  }
});
