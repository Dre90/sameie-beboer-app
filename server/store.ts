import { getDatabase } from "@netlify/database";
import type { Role, UnitField, UnitStatus } from "../src/lib/filter-types";

type Database = ReturnType<typeof getDatabase>;
type Session = { role: Role; credential_version: string; expires_at: Date };
type StoredUnit = Omit<UnitStatus, "updated_at"> & { updated_at: Date };

function serializeUnit(unit: StoredUnit): UnitStatus {
  return { ...unit, updated_at: unit.updated_at.toISOString() };
}

// One explicit statement per column, so no identifier is ever built from request data.
function updateField(
  database: Database,
  id: string,
  field: UnitField,
  value: string,
  version: number,
) {
  switch (field) {
    case "response":
      return database.sql<StoredUnit>`UPDATE unit_status SET response = ${value}, version = version + 1, updated_at = now()
        WHERE id = ${id} AND version = ${version}
        RETURNING id, response, completion, board_comment, craftsman_comment, version, updated_at`;
    case "completion":
      return database.sql<StoredUnit>`UPDATE unit_status SET completion = ${value}, version = version + 1, updated_at = now()
        WHERE id = ${id} AND version = ${version}
        RETURNING id, response, completion, board_comment, craftsman_comment, version, updated_at`;
    case "board_comment":
      return database.sql<StoredUnit>`UPDATE unit_status SET board_comment = ${value}, version = version + 1, updated_at = now()
        WHERE id = ${id} AND version = ${version}
        RETURNING id, response, completion, board_comment, craftsman_comment, version, updated_at`;
    case "craftsman_comment":
      return database.sql<StoredUnit>`UPDATE unit_status SET craftsman_comment = ${value}, version = version + 1, updated_at = now()
        WHERE id = ${id} AND version = ${version}
        RETURNING id, response, completion, board_comment, craftsman_comment, version, updated_at`;
  }
}

export function createStore(database: Database) {
  return {
    async list(): Promise<UnitStatus[]> {
      const units =
        await database.sql<StoredUnit>`SELECT id, response, completion, board_comment, craftsman_comment, version, updated_at
        FROM unit_status ORDER BY id`;
      return units.map(serializeUnit);
    },
    async update(id: string, field: UnitField, value: string, version: number) {
      const rows = await updateField(database, id, field, value, version);
      return rows[0] ? serializeUnit(rows[0]) : null;
    },
    async createSession(tokenHash: string, role: Role, credentialVersion: string, expires: Date) {
      await database.sql`DELETE FROM sessions WHERE expires_at <= now()`;
      await database.sql`INSERT INTO sessions (token_hash, role, credential_version, expires_at)
        VALUES (${tokenHash}, ${role}, ${credentialVersion}, ${expires.toISOString()})`;
    },
    async session(tokenHash: string) {
      const rows =
        await database.sql<Session>`SELECT role, credential_version, expires_at FROM sessions
        WHERE token_hash = ${tokenHash} AND expires_at > now()`;
      return rows[0] ?? null;
    },
    async deleteSession(tokenHash: string) {
      await database.sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
    },
    async allowLogin(clientHash: string) {
      await database.sql`DELETE FROM login_attempts WHERE expires_at <= now()`;
      const rows = await database.sql<{
        attempts: number;
      }>`INSERT INTO login_attempts (client_hash, attempts, expires_at)
        VALUES (${clientHash}, 1, now() + interval '15 minutes')
        ON CONFLICT (client_hash) DO UPDATE SET attempts = login_attempts.attempts + 1
        RETURNING attempts`;
      return rows[0].attempts <= 10;
    },
  };
}

export type Store = ReturnType<typeof createStore>;
