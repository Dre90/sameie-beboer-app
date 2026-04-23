import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { loadUser, requireAccessJwt, requireRole } from "../lib/middleware";
import type { AppVariables, Resident, Unit, WorkerEnv } from "../types";

type Ctx = { Bindings: WorkerEnv; Variables: AppVariables };

export const unitsRoute = new Hono<Ctx>();

// All users (any role) can view units. Mutations are board-only.
unitsRoute.use("*", requireAccessJwt(), loadUser());

function mapUnit(row: Record<string, unknown>): Unit {
  return {
    id: row.id as string,
    is_rented: Number(row.is_rented) === 1,
    owner_name: (row.owner_name as string | null) ?? null,
    owner_email: (row.owner_email as string | null) ?? null,
    owner_phone: (row.owner_phone as string | null) ?? null,
    updated_at: row.updated_at as string,
  };
}

unitsRoute.get("/", async (c) => {
  const units = await c.env.DB.prepare(
    "SELECT id, is_rented, owner_name, owner_email, owner_phone, updated_at FROM units ORDER BY id ASC",
  ).all<Record<string, unknown>>();
  const residents = await c.env.DB.prepare(
    "SELECT id, unit_id, name, email, phone, created_at FROM residents ORDER BY unit_id, id ASC",
  ).all<Resident>();

  const residentsByUnit = new Map<string, Resident[]>();
  for (const r of residents.results) {
    const list = residentsByUnit.get(r.unit_id) ?? [];
    list.push(r);
    residentsByUnit.set(r.unit_id, list);
  }

  const result = units.results.map((u) => {
    const unit = mapUnit(u);
    return { ...unit, residents: residentsByUnit.get(unit.id) ?? [] };
  });
  return c.json({ units: result });
});

unitsRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(
    "SELECT id, is_rented, owner_name, owner_email, owner_phone, updated_at FROM units WHERE id = ?",
  )
    .bind(id)
    .first<Record<string, unknown>>();
  if (!row) throw new HTTPException(404, { message: "Leilighet ikke funnet" });

  const residents = await c.env.DB.prepare(
    "SELECT id, unit_id, name, email, phone, created_at FROM residents WHERE unit_id = ? ORDER BY id ASC",
  )
    .bind(id)
    .all<Resident>();

  return c.json({ unit: mapUnit(row), residents: residents.results });
});

unitsRoute.put("/:id", requireRole("board"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Partial<Omit<Unit, "id" | "updated_at">>>();
  await c.env.DB.prepare(
    `INSERT INTO units (id, is_rented, owner_name, owner_email, owner_phone, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       is_rented = excluded.is_rented,
       owner_name = excluded.owner_name,
       owner_email = excluded.owner_email,
       owner_phone = excluded.owner_phone,
       updated_at = excluded.updated_at`,
  )
    .bind(
      id,
      body.is_rented ? 1 : 0,
      body.owner_name ?? null,
      body.owner_email ?? null,
      body.owner_phone ?? null,
    )
    .run();
  const row = await c.env.DB.prepare(
    "SELECT id, is_rented, owner_name, owner_email, owner_phone, updated_at FROM units WHERE id = ?",
  )
    .bind(id)
    .first<Record<string, unknown>>();
  return c.json({ unit: row ? mapUnit(row) : null });
});

// Residents (nested under unit)
unitsRoute.post("/:id/residents", requireRole("board"), async (c) => {
  const unitId = c.req.param("id");
  const body = await c.req.json<Partial<Omit<Resident, "id" | "created_at" | "unit_id">>>();
  if (!body.name?.trim()) {
    throw new HTTPException(400, { message: "name kreves" });
  }
  // Ensure unit row exists (auto-create stub so residents can be added even before admin
  // has filled in rental info).
  await c.env.DB.prepare("INSERT OR IGNORE INTO units (id) VALUES (?)").bind(unitId).run();
  const res = await c.env.DB.prepare(
    "INSERT INTO residents (unit_id, name, email, phone) VALUES (?, ?, ?, ?) RETURNING id, unit_id, name, email, phone, created_at",
  )
    .bind(unitId, body.name.trim(), body.email ?? null, body.phone ?? null)
    .first<Resident>();
  return c.json({ resident: res }, 201);
});

unitsRoute.patch("/:id/residents/:residentId", requireRole("board"), async (c) => {
  const unitId = c.req.param("id");
  const residentId = Number(c.req.param("residentId"));
  const body = await c.req.json<Partial<Omit<Resident, "id" | "created_at" | "unit_id">>>();
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  for (const key of ["name", "email", "phone"] as const) {
    if (body[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(body[key] ?? null);
    }
  }
  if (sets.length === 0) throw new HTTPException(400, { message: "Ingenting å oppdatere" });
  params.push(residentId, unitId);
  const res = await c.env.DB.prepare(
    `UPDATE residents SET ${sets.join(", ")} WHERE id = ? AND unit_id = ?`,
  )
    .bind(...params)
    .run();
  if (res.meta.changes === 0) throw new HTTPException(404, { message: "Beboer ikke funnet" });
  const row = await c.env.DB.prepare(
    "SELECT id, unit_id, name, email, phone, created_at FROM residents WHERE id = ?",
  )
    .bind(residentId)
    .first<Resident>();
  return c.json({ resident: row });
});

unitsRoute.delete("/:id/residents/:residentId", requireRole("board"), async (c) => {
  const unitId = c.req.param("id");
  const residentId = Number(c.req.param("residentId"));
  const res = await c.env.DB.prepare("DELETE FROM residents WHERE id = ? AND unit_id = ?")
    .bind(residentId, unitId)
    .run();
  if (res.meta.changes === 0) throw new HTTPException(404, { message: "Beboer ikke funnet" });
  return c.json({ ok: true });
});
