import { vi } from "vite-plus/test";
import type { WorkerEnv } from "../types";

/**
 * Simple in-memory fake of D1 that supports only what our Worker routes use.
 * We implement SQL *by interpretation* — the fake matches SQL text prefixes and
 * routes them to typed operations. This is much smaller than a real SQL engine
 * but enough to verify route logic and authz.
 *
 * If adding new SQL, extend the handler below.
 */
type Row = Record<string, unknown>;

export type TestEnv = WorkerEnv & {
  __state: FakeDbState;
};

type FakeDbState = {
  users: Map<string, Row>;
  units: Map<string, Row>;
  residents: Row[];
  nextResidentId: number;
  activities: Row[];
  nextActivityId: number;
  responses: Map<string, Row>; // key: `${activity_id}:${unit_id}`
  completions: Map<string, Row>; // key: `${activity_id}:${unit_id}`
};

export function makeTestEnv(overrides: Partial<WorkerEnv> = {}): TestEnv {
  const state: FakeDbState = {
    users: new Map(),
    units: new Map(),
    residents: [],
    nextResidentId: 1,
    activities: [],
    nextActivityId: 1,
    responses: new Map(),
    completions: new Map(),
  };

  const DB = makeFakeD1(state);

  return {
    DB,
    ACCESS_TEAM_DOMAIN: "test-team.cloudflareaccess.com",
    ACCESS_AUD: "test-aud",
    DEV_BYPASS_AUTH: "true",
    DEV_USER_EMAIL: "board@example.com",
    __state: state,
    ...overrides,
  } as TestEnv;
}

function makeFakeD1(state: FakeDbState): D1Database {
  const prepare = (sql: string): D1PreparedStatement => {
    const normalized = sql.trim().replace(/\s+/g, " ");
    let bound: unknown[] = [];
    const stmt: Partial<D1PreparedStatement> = {
      bind(...params: unknown[]) {
        bound = params;
        return stmt as D1PreparedStatement;
      },
      async first<T = unknown>(): Promise<T | null> {
        const rows = runQuery(normalized, bound, state);
        const arr = Array.isArray(rows) ? rows : [];
        return (arr[0] as T | undefined) ?? null;
      },
      async all<T = unknown>() {
        const rows = runQuery(normalized, bound, state);
        const arr = Array.isArray(rows) ? rows : [];
        return {
          results: arr as T[],
          success: true,
          meta: { duration: 0, rows_read: arr.length, rows_written: 0 },
        } as unknown as D1Result<T>;
      },
      async run<T = Record<string, unknown>>() {
        const result = runQuery(normalized, bound, state);
        const changes = Array.isArray(result)
          ? 0
          : typeof result === "object" && "changes" in (result as object)
            ? (result as { changes: number }).changes
            : 0;
        return {
          success: true,
          meta: { duration: 0, changes, rows_read: 0, rows_written: changes },
          results: [],
        } as unknown as D1Result<T>;
      },
    };
    return stmt as D1PreparedStatement;
  };

  return {
    prepare,
    dump: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn(),
  } as unknown as D1Database;
}

/**
 * Very small SQL dispatcher — recognizes each query used by our routes.
 * Keep aligned with actual queries. Throws on unknown SQL to catch drift.
 */
function runQuery(sql: string, params: unknown[], s: FakeDbState): Row[] | { changes: number } {
  // ---------- USERS ----------
  if (sql.startsWith("SELECT email, name, role, created_at FROM users WHERE email = ?")) {
    const row = s.users.get(String(params[0]));
    return row ? [row] : [];
  }
  if (sql.startsWith("SELECT email, name, role, created_at FROM users ORDER BY")) {
    return [...s.users.values()];
  }
  if (sql.startsWith("INSERT INTO users (email, name, role) VALUES (?, ?, ?)")) {
    const [email, name, role] = params as [string, string, string];
    if (s.users.has(email)) throw new Error("UNIQUE constraint failed: users.email");
    s.users.set(email, { email, name, role, created_at: new Date().toISOString() });
    return { changes: 1 };
  }
  if (sql.startsWith("UPDATE users SET")) {
    // Last param is email
    const email = String(params[params.length - 1]);
    const row = s.users.get(email);
    if (!row) return { changes: 0 };
    // Parse "col = ?, col = ?" from sql
    const match = sql.match(/UPDATE users SET (.+) WHERE email = \?/);
    const cols = match?.[1].split(",").map((c) => c.trim().split("=")[0].trim()) ?? [];
    cols.forEach((col, i) => {
      row[col] = params[i];
    });
    return { changes: 1 };
  }
  if (sql.startsWith("DELETE FROM users WHERE email = ?")) {
    return { changes: s.users.delete(String(params[0])) ? 1 : 0 };
  }

  // ---------- UNITS ----------
  if (
    sql.startsWith(
      "SELECT id, is_rented, owner_name, owner_email, owner_phone, updated_at FROM units ORDER BY",
    )
  ) {
    return [...s.units.values()];
  }
  if (
    sql.startsWith(
      "SELECT id, is_rented, owner_name, owner_email, owner_phone, updated_at FROM units WHERE id = ?",
    )
  ) {
    const u = s.units.get(String(params[0]));
    return u ? [u] : [];
  }
  if (sql.startsWith("INSERT OR IGNORE INTO units (id) VALUES (?)")) {
    const id = String(params[0]);
    if (!s.units.has(id)) {
      s.units.set(id, {
        id,
        is_rented: 0,
        owner_name: null,
        owner_email: null,
        owner_phone: null,
        updated_at: new Date().toISOString(),
      });
    }
    return { changes: 1 };
  }
  if (sql.startsWith("INSERT INTO units (id, is_rented")) {
    const [id, isRented, ownerName, ownerEmail, ownerPhone] = params as [
      string,
      number,
      string | null,
      string | null,
      string | null,
    ];
    s.units.set(id, {
      id,
      is_rented: isRented,
      owner_name: ownerName,
      owner_email: ownerEmail,
      owner_phone: ownerPhone,
      updated_at: new Date().toISOString(),
    });
    return { changes: 1 };
  }

  // ---------- RESIDENTS ----------
  if (
    sql.startsWith(
      "SELECT id, unit_id, name, email, phone, created_at FROM residents ORDER BY unit_id",
    )
  ) {
    return [...s.residents];
  }
  if (
    sql.startsWith(
      "SELECT id, unit_id, name, email, phone, created_at FROM residents WHERE unit_id = ?",
    )
  ) {
    return s.residents.filter((r) => r.unit_id === String(params[0]));
  }
  if (
    sql.startsWith("SELECT id, unit_id, name, email, phone, created_at FROM residents WHERE id = ?")
  ) {
    const r = s.residents.find((x) => x.id === Number(params[0]));
    return r ? [r] : [];
  }
  if (
    sql.startsWith(
      "INSERT INTO residents (unit_id, name, email, phone) VALUES (?, ?, ?, ?) RETURNING",
    )
  ) {
    const [unitId, name, email, phone] = params as [string, string, string | null, string | null];
    const row: Row = {
      id: s.nextResidentId++,
      unit_id: unitId,
      name,
      email,
      phone,
      created_at: new Date().toISOString(),
    };
    s.residents.push(row);
    return [row];
  }
  if (sql.startsWith("UPDATE residents SET")) {
    const residentId = Number(params[params.length - 2]);
    const unitId = String(params[params.length - 1]);
    const r = s.residents.find((x) => x.id === residentId && x.unit_id === unitId);
    if (!r) return { changes: 0 };
    const match = sql.match(/UPDATE residents SET (.+) WHERE id/);
    const cols = match?.[1].split(",").map((c) => c.trim().split("=")[0].trim()) ?? [];
    cols.forEach((col, i) => {
      r[col] = params[i];
    });
    return { changes: 1 };
  }
  if (sql.startsWith("DELETE FROM residents WHERE id = ? AND unit_id = ?")) {
    const residentId = Number(params[0]);
    const unitId = String(params[1]);
    const idx = s.residents.findIndex((x) => x.id === residentId && x.unit_id === unitId);
    if (idx === -1) return { changes: 0 };
    s.residents.splice(idx, 1);
    return { changes: 1 };
  }

  // ---------- ACTIVITIES ----------
  if (
    sql.startsWith(
      "SELECT id, title, description, status, deadline, created_at FROM activities ORDER BY",
    )
  ) {
    return [...s.activities].reverse();
  }
  if (
    sql.startsWith(
      "SELECT id, title, description, status, deadline, created_at FROM activities WHERE id = ?",
    )
  ) {
    const a = s.activities.find((x) => x.id === Number(params[0]));
    return a ? [a] : [];
  }
  if (sql.startsWith("INSERT INTO activities (title, description, status, deadline)")) {
    const [title, description, status, deadline] = params as [
      string,
      string | null,
      string,
      string | null,
    ];
    const row: Row = {
      id: s.nextActivityId++,
      title,
      description,
      status,
      deadline,
      created_at: new Date().toISOString(),
    };
    s.activities.push(row);
    return [row];
  }
  if (sql.startsWith("UPDATE activities SET")) {
    const id = Number(params[params.length - 1]);
    const a = s.activities.find((x) => x.id === id);
    if (!a) return { changes: 0 };
    const match = sql.match(/UPDATE activities SET (.+) WHERE id = \?/);
    const cols = match?.[1].split(",").map((c) => c.trim().split("=")[0].trim()) ?? [];
    cols.forEach((col, i) => {
      a[col] = params[i];
    });
    return { changes: 1 };
  }

  // ---------- ACTIVITY_RESPONSES ----------
  if (
    sql.startsWith(
      "SELECT activity_id, unit_id, response, note, updated_at FROM activity_responses WHERE activity_id = ? AND unit_id = ?",
    )
  ) {
    const k = `${String(params[0])}:${String(params[1])}`;
    const r = s.responses.get(k);
    return r ? [r] : [];
  }
  if (
    sql.startsWith(
      "SELECT activity_id, unit_id, response, note, updated_at FROM activity_responses WHERE activity_id = ?",
    )
  ) {
    const activityId = Number(params[0]);
    return [...s.responses.values()].filter((r) => r.activity_id === activityId);
  }
  if (sql.startsWith("INSERT INTO activity_responses")) {
    const [activityId, unitId, response, note] = params as [number, string, string, string | null];
    s.responses.set(`${activityId}:${unitId}`, {
      activity_id: activityId,
      unit_id: unitId,
      response,
      note,
      updated_at: new Date().toISOString(),
    });
    return { changes: 1 };
  }

  // ---------- ACTIVITY_COMPLETIONS ----------
  if (
    sql.startsWith(
      "SELECT completed_by_email FROM activity_completions WHERE activity_id = ? AND unit_id = ?",
    )
  ) {
    const k = `${String(params[0])}:${String(params[1])}`;
    const c = s.completions.get(k);
    return c ? [{ completed_by_email: c.completed_by_email }] : [];
  }
  if (
    sql.startsWith(
      "SELECT activity_id, unit_id, completed_by_email, completion_type, notes, completed_at FROM activity_completions WHERE activity_id = ? AND unit_id = ?",
    )
  ) {
    const k = `${String(params[0])}:${String(params[1])}`;
    const c = s.completions.get(k);
    return c ? [c] : [];
  }
  if (
    sql.startsWith(
      "SELECT activity_id, unit_id, completed_by_email, completion_type, notes, completed_at FROM activity_completions WHERE activity_id = ?",
    )
  ) {
    const activityId = Number(params[0]);
    return [...s.completions.values()].filter((c) => c.activity_id === activityId);
  }
  if (sql.startsWith("INSERT INTO activity_completions")) {
    const [activityId, unitId, email, type, notes] = params as [
      number,
      string,
      string,
      string,
      string | null,
    ];
    s.completions.set(`${activityId}:${unitId}`, {
      activity_id: activityId,
      unit_id: unitId,
      completed_by_email: email,
      completion_type: type,
      notes,
      completed_at: new Date().toISOString(),
    });
    return { changes: 1 };
  }
  if (sql.startsWith("DELETE FROM activity_completions WHERE activity_id = ? AND unit_id = ?")) {
    const k = `${String(params[0])}:${String(params[1])}`;
    return { changes: s.completions.delete(k) ? 1 : 0 };
  }

  throw new Error(`Unhandled SQL in test fake: ${sql}`);
}
