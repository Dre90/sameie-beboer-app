-- sameie-beboer-app database schema
-- Run: wrangler d1 execute sameie-beboer-app-db --file=./worker/schema.sql
-- For local: add --local

-- Drop in reverse dependency order (for clean re-runs during development)
-- Comment out DROP statements once in production.
DROP TABLE IF EXISTS activity_completions;
DROP TABLE IF EXISTS activity_responses;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS residents;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  email TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('board', 'craftsman')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE units (
  id TEXT PRIMARY KEY NOT NULL, -- e.g. "B24", matches frontend unit IDs
  is_rented INTEGER NOT NULL DEFAULT 0 CHECK (is_rented IN (0, 1)),
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE residents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_residents_unit ON residents(unit_id);

CREATE TABLE activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'done')),
  deadline TEXT, -- ISO date
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE activity_responses (
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  response TEXT NOT NULL CHECK (response IN ('home', 'consent', 'self_service', 'unanswered')),
  note TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (activity_id, unit_id)
);

CREATE TABLE activity_completions (
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  completed_by_email TEXT NOT NULL REFERENCES users(email),
  completion_type TEXT NOT NULL CHECK (completion_type IN ('performed', 'delivered')),
  notes TEXT,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (activity_id, unit_id)
);
