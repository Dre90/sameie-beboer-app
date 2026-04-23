import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { loadUser, requireAccessJwt, requireRole } from "../lib/middleware";
import type {
  Activity,
  ActivityCompletion,
  ActivityResponse,
  ActivityResponseKind,
  AppVariables,
  CompletionType,
  WorkerEnv,
} from "../types";

type Ctx = { Bindings: WorkerEnv; Variables: AppVariables };

export const activitiesRoute = new Hono<Ctx>();

activitiesRoute.use("*", requireAccessJwt(), loadUser());

activitiesRoute.get("/", async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT id, title, description, status, deadline, created_at FROM activities ORDER BY created_at DESC",
  ).all<Activity>();
  return c.json({ activities: result.results });
});

activitiesRoute.post("/", requireRole("board"), async (c) => {
  const body = await c.req.json<Partial<Activity>>();
  if (!body.title?.trim()) throw new HTTPException(400, { message: "title kreves" });
  const status = body.status ?? "draft";
  if (!["draft", "active", "done"].includes(status)) {
    throw new HTTPException(400, { message: "Ugyldig status" });
  }
  const inserted = await c.env.DB.prepare(
    "INSERT INTO activities (title, description, status, deadline) VALUES (?, ?, ?, ?) RETURNING id, title, description, status, deadline, created_at",
  )
    .bind(body.title.trim(), body.description ?? null, status, body.deadline ?? null)
    .first<Activity>();
  return c.json({ activity: inserted }, 201);
});

activitiesRoute.patch("/:id", requireRole("board"), async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<Partial<Activity>>();
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  for (const key of ["title", "description", "status", "deadline"] as const) {
    if (body[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(body[key] ?? null);
    }
  }
  if (sets.length === 0) throw new HTTPException(400, { message: "Ingenting å oppdatere" });
  params.push(id);
  const res = await c.env.DB.prepare(`UPDATE activities SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...params)
    .run();
  if (res.meta.changes === 0) throw new HTTPException(404, { message: "Aktivitet ikke funnet" });
  const row = await c.env.DB.prepare(
    "SELECT id, title, description, status, deadline, created_at FROM activities WHERE id = ?",
  )
    .bind(id)
    .first<Activity>();
  return c.json({ activity: row });
});

// Activity status per unit: responses + completions combined.
activitiesRoute.get("/:id/status", async (c) => {
  const id = Number(c.req.param("id"));
  const responses = await c.env.DB.prepare(
    "SELECT activity_id, unit_id, response, note, updated_at FROM activity_responses WHERE activity_id = ?",
  )
    .bind(id)
    .all<ActivityResponse>();
  const completions = await c.env.DB.prepare(
    "SELECT activity_id, unit_id, completed_by_email, completion_type, notes, completed_at FROM activity_completions WHERE activity_id = ?",
  )
    .bind(id)
    .all<ActivityCompletion>();
  return c.json({
    responses: responses.results,
    completions: completions.results,
  });
});

// Set/update the resident response for a unit (board only)
activitiesRoute.put("/:id/responses/:unitId", requireRole("board"), async (c) => {
  const activityId = Number(c.req.param("id"));
  const unitId = c.req.param("unitId");
  const body = await c.req.json<{ response: ActivityResponseKind; note?: string }>();
  const allowed: ActivityResponseKind[] = ["home", "consent", "self_service", "unanswered"];
  if (!allowed.includes(body.response)) {
    throw new HTTPException(400, { message: "Ugyldig response-verdi" });
  }
  await c.env.DB.prepare("INSERT OR IGNORE INTO units (id) VALUES (?)").bind(unitId).run();
  await c.env.DB.prepare(
    `INSERT INTO activity_responses (activity_id, unit_id, response, note, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(activity_id, unit_id) DO UPDATE SET
       response = excluded.response,
       note = excluded.note,
       updated_at = excluded.updated_at`,
  )
    .bind(activityId, unitId, body.response, body.note ?? null)
    .run();
  const row = await c.env.DB.prepare(
    "SELECT activity_id, unit_id, response, note, updated_at FROM activity_responses WHERE activity_id = ? AND unit_id = ?",
  )
    .bind(activityId, unitId)
    .first<ActivityResponse>();
  return c.json({ response: row });
});

// Mark a unit as completed (craftsmen and board)
activitiesRoute.post("/:id/completions/:unitId", async (c) => {
  const user = c.get("user");
  const activityId = Number(c.req.param("id"));
  const unitId = c.req.param("unitId");
  const body = await c.req.json<{ completion_type: CompletionType; notes?: string }>();
  const allowed: CompletionType[] = ["performed", "delivered"];
  if (!allowed.includes(body.completion_type)) {
    throw new HTTPException(400, { message: "Ugyldig completion_type" });
  }
  await c.env.DB.prepare("INSERT OR IGNORE INTO units (id) VALUES (?)").bind(unitId).run();
  await c.env.DB.prepare(
    `INSERT INTO activity_completions (activity_id, unit_id, completed_by_email, completion_type, notes, completed_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(activity_id, unit_id) DO UPDATE SET
       completed_by_email = excluded.completed_by_email,
       completion_type = excluded.completion_type,
       notes = excluded.notes,
       completed_at = excluded.completed_at`,
  )
    .bind(activityId, unitId, user.email, body.completion_type, body.notes ?? null)
    .run();
  const row = await c.env.DB.prepare(
    "SELECT activity_id, unit_id, completed_by_email, completion_type, notes, completed_at FROM activity_completions WHERE activity_id = ? AND unit_id = ?",
  )
    .bind(activityId, unitId)
    .first<ActivityCompletion>();
  return c.json({ completion: row }, 201);
});

// Remove a completion (e.g. craftsman pressed OK by mistake). Any authenticated user can remove
// their own; board can remove any.
activitiesRoute.delete("/:id/completions/:unitId", async (c) => {
  const user = c.get("user");
  const activityId = Number(c.req.param("id"));
  const unitId = c.req.param("unitId");
  const existing = await c.env.DB.prepare(
    "SELECT completed_by_email FROM activity_completions WHERE activity_id = ? AND unit_id = ?",
  )
    .bind(activityId, unitId)
    .first<{ completed_by_email: string }>();
  if (!existing) throw new HTTPException(404, { message: "Ingen ferdigmelding funnet" });
  if (user.role !== "board" && existing.completed_by_email !== user.email) {
    throw new HTTPException(403, { message: "Kun opphaver eller styret kan angre" });
  }
  await c.env.DB.prepare("DELETE FROM activity_completions WHERE activity_id = ? AND unit_id = ?")
    .bind(activityId, unitId)
    .run();
  return c.json({ ok: true });
});
