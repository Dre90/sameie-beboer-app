import { Hono } from "hono";
import { describe, expect, test } from "vite-plus/test";
import { loadUser, requireAccessJwt, requireRole } from "./middleware";
import type { AppVariables, WorkerEnv } from "../types";
import { makeTestEnv } from "../test/fakeDb";

type Ctx = { Bindings: WorkerEnv; Variables: AppVariables };

describe("middleware", () => {
  test("requireAccessJwt fails in prod mode with no token", async () => {
    const env = makeTestEnv({ DEV_BYPASS_AUTH: "false" });
    const app = new Hono<Ctx>();
    app.use(requireAccessJwt());
    app.get("/", (c) => c.text("ok"));
    const res = await app.request("/", {}, env);
    expect(res.status).toBe(401);
  });

  test("requireAccessJwt fails in dev mode without DEV_USER_EMAIL", async () => {
    const env = makeTestEnv({ DEV_BYPASS_AUTH: "true", DEV_USER_EMAIL: undefined });
    const app = new Hono<Ctx>();
    app.use(requireAccessJwt());
    app.get("/", (c) => c.text("ok"));
    const res = await app.request("/", {}, env);
    expect(res.status).toBe(500);
  });

  test("requireAccessJwt with invalid token is rejected", async () => {
    const env = makeTestEnv({ DEV_BYPASS_AUTH: "false" });
    const app = new Hono<Ctx>();
    app.use(requireAccessJwt());
    app.get("/", (c) => c.text("ok"));
    const res = await app.request(
      "/",
      { headers: { "Cf-Access-Jwt-Assertion": "not.a.jwt" } },
      env,
    );
    expect(res.status).toBe(401);
  });

  test("requireAccessJwt picks up CF_Authorization cookie", async () => {
    const env = makeTestEnv({ DEV_BYPASS_AUTH: "false" });
    const app = new Hono<Ctx>();
    app.use(requireAccessJwt());
    app.get("/", (c) => c.text("ok"));
    const res = await app.request(
      "/",
      { headers: { Cookie: "other=1; CF_Authorization=bad.token.here" } },
      env,
    );
    expect(res.status).toBe(401);
  });

  test("requireRole enforces roles", async () => {
    const env = makeTestEnv();
    env.__state.users.set("board@example.com", {
      email: "board@example.com",
      name: "B",
      role: "craftsman",
      created_at: "",
    });
    const app = new Hono<Ctx>();
    app.use(requireAccessJwt(), loadUser(), requireRole("board"));
    app.get("/", (c) => c.text("ok"));
    const res = await app.request("/", {}, env);
    expect(res.status).toBe(403);
  });
});
