import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { loadUser, requireAccessJwt, requireRole } from "../lib/middleware";
import type { AppVariables, User, WorkerEnv } from "../types";

type Ctx = { Bindings: WorkerEnv; Variables: AppVariables };

export const usersRoute = new Hono<Ctx>();

usersRoute.use("*", requireAccessJwt(), loadUser(), requireRole("board"));

usersRoute.get("/", async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT email, name, role, created_at FROM users ORDER BY created_at ASC",
  ).all<User>();
  return c.json({ users: result.results });
});

usersRoute.post("/", async (c) => {
  const body = await c.req.json<Partial<User>>();
  const email = body.email?.toLowerCase().trim();
  const name = body.name?.trim();
  const role = body.role;

  if (!email || !name || (role !== "board" && role !== "craftsman")) {
    throw new HTTPException(400, { message: "email, name og role (board|craftsman) kreves" });
  }

  try {
    await c.env.DB.prepare("INSERT INTO users (email, name, role) VALUES (?, ?, ?)")
      .bind(email, name, role)
      .run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE")) {
      throw new HTTPException(409, { message: "Bruker finnes allerede" });
    }
    throw err;
  }

  const user = await c.env.DB.prepare(
    "SELECT email, name, role, created_at FROM users WHERE email = ?",
  )
    .bind(email)
    .first<User>();
  return c.json({ user }, 201);
});

usersRoute.patch("/:email", async (c) => {
  const email = c.req.param("email").toLowerCase();
  const body = await c.req.json<Partial<Pick<User, "name" | "role">>>();
  const sets: string[] = [];
  const params: (string | number)[] = [];
  if (body.name !== undefined) {
    sets.push("name = ?");
    params.push(body.name);
  }
  if (body.role !== undefined) {
    if (body.role !== "board" && body.role !== "craftsman") {
      throw new HTTPException(400, { message: "Ugyldig rolle" });
    }
    sets.push("role = ?");
    params.push(body.role);
  }
  if (sets.length === 0) {
    throw new HTTPException(400, { message: "Ingenting å oppdatere" });
  }
  params.push(email);
  const res = await c.env.DB.prepare(`UPDATE users SET ${sets.join(", ")} WHERE email = ?`)
    .bind(...params)
    .run();
  if (res.meta.changes === 0) {
    throw new HTTPException(404, { message: "Bruker ikke funnet" });
  }
  const user = await c.env.DB.prepare(
    "SELECT email, name, role, created_at FROM users WHERE email = ?",
  )
    .bind(email)
    .first<User>();
  return c.json({ user });
});

usersRoute.delete("/:email", async (c) => {
  const email = c.req.param("email").toLowerCase();
  const self = c.get("user");
  if (email === self.email) {
    throw new HTTPException(400, { message: "Du kan ikke slette deg selv" });
  }
  const res = await c.env.DB.prepare("DELETE FROM users WHERE email = ?").bind(email).run();
  if (res.meta.changes === 0) {
    throw new HTTPException(404, { message: "Bruker ikke funnet" });
  }
  return c.json({ ok: true });
});
