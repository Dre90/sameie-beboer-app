import { beforeEach, describe, expect, test } from "vite-plus/test";
import app from "./index";
import { makeTestEnv, type TestEnv } from "./test/fakeDb";

function seedBoard(env: TestEnv) {
  env.__state.users.set("board@example.com", {
    email: "board@example.com",
    name: "Styremedlem",
    role: "board",
    created_at: new Date().toISOString(),
  });
}

function seedCraftsman(env: TestEnv) {
  env.__state.users.set("worker@example.com", {
    email: "worker@example.com",
    name: "Håndverker",
    role: "craftsman",
    created_at: new Date().toISOString(),
  });
}

describe("auth / me", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = makeTestEnv();
  });

  test("health is public", async () => {
    const res = await app.request("/api/health", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  test("GET /api/me returns 401 when no auth and no dev bypass", async () => {
    env.DEV_BYPASS_AUTH = "false";
    const res = await app.request("/api/me", {}, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/me returns 403 when email not in allowlist", async () => {
    const res = await app.request("/api/me", {}, env);
    expect(res.status).toBe(403);
  });

  test("GET /api/me returns user when email in allowlist", async () => {
    seedBoard(env);
    const res = await app.request("/api/me", {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<{ user: { email: string; role: string } }>();
    expect(body.user.email).toBe("board@example.com");
    expect(body.user.role).toBe("board");
  });

  test("unknown /api/* returns 404", async () => {
    seedBoard(env);
    const res = await app.request("/api/unknown", {}, env);
    expect(res.status).toBe(404);
  });
});

describe("users routes", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = makeTestEnv();
    seedBoard(env);
  });

  test("craftsman cannot list users", async () => {
    env.__state.users.clear();
    seedCraftsman(env);
    env.DEV_USER_EMAIL = "worker@example.com";
    const res = await app.request("/api/users", {}, env);
    expect(res.status).toBe(403);
  });

  test("board can list, create, patch and delete users", async () => {
    const listEmpty = await app.request("/api/users", {}, env);
    const listed = await listEmpty.json<{ users: unknown[] }>();
    expect(listed.users).toHaveLength(1);

    const create = await app.request(
      "/api/users",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "W@Example.COM", name: "Worker", role: "craftsman" }),
      },
      env,
    );
    expect(create.status).toBe(201);
    const createdBody = await create.json<{ user: { email: string } }>();
    expect(createdBody.user.email).toBe("w@example.com");

    const dupe = await app.request(
      "/api/users",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "w@example.com", name: "Dup", role: "craftsman" }),
      },
      env,
    );
    expect(dupe.status).toBe(409);

    const bad = await app.request(
      "/api/users",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "x@example.com" }),
      },
      env,
    );
    expect(bad.status).toBe(400);

    const patch = await app.request(
      "/api/users/w@example.com",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Ny Håndverker" }),
      },
      env,
    );
    expect(patch.status).toBe(200);

    const patchBadRole = await app.request(
      "/api/users/w@example.com",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin" }),
      },
      env,
    );
    expect(patchBadRole.status).toBe(400);

    const patchEmpty = await app.request(
      "/api/users/w@example.com",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(patchEmpty.status).toBe(400);

    const patchMissing = await app.request(
      "/api/users/missing@example.com",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "x" }),
      },
      env,
    );
    expect(patchMissing.status).toBe(404);

    const selfDelete = await app.request(
      "/api/users/board@example.com",
      {
        method: "DELETE",
      },
      env,
    );
    expect(selfDelete.status).toBe(400);

    const del = await app.request("/api/users/w@example.com", { method: "DELETE" }, env);
    expect(del.status).toBe(200);

    const delMissing = await app.request("/api/users/w@example.com", { method: "DELETE" }, env);
    expect(delMissing.status).toBe(404);
  });
});

describe("units + residents routes", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = makeTestEnv();
    seedBoard(env);
  });

  test("craftsman can read but not mutate", async () => {
    env.__state.users.clear();
    seedCraftsman(env);
    env.DEV_USER_EMAIL = "worker@example.com";

    const read = await app.request("/api/units", {}, env);
    expect(read.status).toBe(200);

    const write = await app.request(
      "/api/units/B24",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_rented: true, owner_name: "Eier" }),
      },
      env,
    );
    expect(write.status).toBe(403);
  });

  test("board can upsert a unit and manage residents", async () => {
    const upsert = await app.request(
      "/api/units/B24",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_rented: true,
          owner_name: "Eier",
          owner_email: "eier@example.com",
          owner_phone: "12345678",
        }),
      },
      env,
    );
    expect(upsert.status).toBe(200);

    const add = await app.request(
      "/api/units/B24/residents",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Leietaker 1", email: "l1@example.com", phone: "111" }),
      },
      env,
    );
    expect(add.status).toBe(201);
    const resident = (await add.json<{ resident: { id: number } }>()).resident;

    const addEmpty = await app.request(
      "/api/units/B24/residents",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "  " }),
      },
      env,
    );
    expect(addEmpty.status).toBe(400);

    const detail = await app.request("/api/units/B24", {}, env);
    expect(detail.status).toBe(200);
    const detailBody = await detail.json<{ unit: { is_rented: boolean }; residents: unknown[] }>();
    expect(detailBody.unit.is_rented).toBe(true);
    expect(detailBody.residents).toHaveLength(1);

    const missing = await app.request("/api/units/Z99", {}, env);
    expect(missing.status).toBe(404);

    const patchResident = await app.request(
      `/api/units/B24/residents/${resident.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "999" }),
      },
      env,
    );
    expect(patchResident.status).toBe(200);

    const patchEmpty = await app.request(
      `/api/units/B24/residents/${resident.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(patchEmpty.status).toBe(400);

    const patchMissing = await app.request(
      "/api/units/B24/residents/999",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "0" }),
      },
      env,
    );
    expect(patchMissing.status).toBe(404);

    const delResident = await app.request(
      `/api/units/B24/residents/${resident.id}`,
      { method: "DELETE" },
      env,
    );
    expect(delResident.status).toBe(200);

    const delMissing = await app.request(
      `/api/units/B24/residents/${resident.id}`,
      { method: "DELETE" },
      env,
    );
    expect(delMissing.status).toBe(404);
  });

  test("listing units includes residents grouped per unit", async () => {
    await app.request(
      "/api/units/B24/residents",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "A" }),
      },
      env,
    );
    await app.request(
      "/api/units/B24/residents",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "B" }),
      },
      env,
    );
    const res = await app.request("/api/units", {}, env);
    const body = await res.json<{ units: { id: string; residents: unknown[] }[] }>();
    const b24 = body.units.find((u) => u.id === "B24");
    expect(b24?.residents).toHaveLength(2);
  });
});

describe("activities routes", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = makeTestEnv();
    seedBoard(env);
  });

  test("full activity lifecycle", async () => {
    const create = await app.request(
      "/api/activities",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Bytte luftfilter",
          description: "Årlig service",
          status: "active",
        }),
      },
      env,
    );
    expect(create.status).toBe(201);
    const created = (await create.json<{ activity: { id: number } }>()).activity;

    const createNoTitle = await app.request(
      "/api/activities",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      },
      env,
    );
    expect(createNoTitle.status).toBe(400);

    const badStatus = await app.request(
      "/api/activities",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "x", status: "nope" }),
      },
      env,
    );
    expect(badStatus.status).toBe(400);

    const list = await app.request("/api/activities", {}, env);
    const listBody = await list.json<{ activities: unknown[] }>();
    expect(listBody.activities).toHaveLength(1);

    const patch = await app.request(
      `/api/activities/${created.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "oppdatert" }),
      },
      env,
    );
    expect(patch.status).toBe(200);

    const patchMissing = await app.request(
      "/api/activities/999",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "x" }),
      },
      env,
    );
    expect(patchMissing.status).toBe(404);

    const patchEmpty = await app.request(
      `/api/activities/${created.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(patchEmpty.status).toBe(400);

    const setResponse = await app.request(
      `/api/activities/${created.id}/responses/B24`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: "self_service", note: "har filter selv" }),
      },
      env,
    );
    expect(setResponse.status).toBe(200);

    const badResponse = await app.request(
      `/api/activities/${created.id}/responses/B24`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: "bogus" }),
      },
      env,
    );
    expect(badResponse.status).toBe(400);

    const complete = await app.request(
      `/api/activities/${created.id}/completions/B24`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completion_type: "delivered", notes: "lagt på dørmatten" }),
      },
      env,
    );
    expect(complete.status).toBe(201);

    const badComplete = await app.request(
      `/api/activities/${created.id}/completions/B24`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completion_type: "nope" }),
      },
      env,
    );
    expect(badComplete.status).toBe(400);

    const status = await app.request(`/api/activities/${created.id}/status`, {}, env);
    expect(status.status).toBe(200);
    const statusBody = await status.json<{ responses: unknown[]; completions: unknown[] }>();
    expect(statusBody.responses).toHaveLength(1);
    expect(statusBody.completions).toHaveLength(1);

    const undo = await app.request(
      `/api/activities/${created.id}/completions/B24`,
      { method: "DELETE" },
      env,
    );
    expect(undo.status).toBe(200);

    const undoMissing = await app.request(
      `/api/activities/${created.id}/completions/B24`,
      { method: "DELETE" },
      env,
    );
    expect(undoMissing.status).toBe(404);
  });

  test("craftsman can complete but not edit activity metadata", async () => {
    const created = await app.request(
      "/api/activities",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "t", status: "active" }),
      },
      env,
    );
    const activity = (await created.json<{ activity: { id: number } }>()).activity;

    // switch to craftsman
    env.__state.users.clear();
    seedCraftsman(env);
    env.DEV_USER_EMAIL = "worker@example.com";

    const editAttempt = await app.request(
      `/api/activities/${activity.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "hijacked" }),
      },
      env,
    );
    expect(editAttempt.status).toBe(403);

    const complete = await app.request(
      `/api/activities/${activity.id}/completions/B24`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completion_type: "performed" }),
      },
      env,
    );
    expect(complete.status).toBe(201);
  });

  test("non-owning craftsman cannot delete another user's completion", async () => {
    const created = await app.request(
      "/api/activities",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "t", status: "active" }),
      },
      env,
    );
    const activity = (await created.json<{ activity: { id: number } }>()).activity;

    // craftsman A completes
    seedCraftsman(env);
    env.__state.users.set("other@example.com", {
      email: "other@example.com",
      name: "Annen",
      role: "craftsman",
      created_at: new Date().toISOString(),
    });
    env.DEV_USER_EMAIL = "worker@example.com";
    await app.request(
      `/api/activities/${activity.id}/completions/B24`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completion_type: "performed" }),
      },
      env,
    );

    // craftsman B tries to undo
    env.DEV_USER_EMAIL = "other@example.com";
    const undo = await app.request(
      `/api/activities/${activity.id}/completions/B24`,
      { method: "DELETE" },
      env,
    );
    expect(undo.status).toBe(403);
  });
});
