CREATE TABLE unit_status (
  id TEXT PRIMARY KEY,
  response TEXT NOT NULL DEFAULT 'unanswered' CHECK (response IN ('unanswered', 'home', 'consent', 'self_service')),
  completion TEXT NOT NULL DEFAULT 'pending' CHECK (completion IN ('pending', 'performed', 'delivered')),
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO unit_status (id)
SELECT building || floor::text || number::text
FROM (VALUES ('A', 1, 9), ('A', 2, 8), ('B', 1, 9), ('B', 2, 8), ('B', 3, 6)) AS floors(building, floor, total)
CROSS JOIN LATERAL generate_series(1, total) AS number;
INSERT INTO unit_status (id) SELECT 'C' || number::text FROM generate_series(1, 7) AS number;

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('board', 'craftsman')),
  credential_version TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);

CREATE TABLE login_attempts (
  client_hash TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);