/**
 * Postgres DDL — idempotent. Applied as a Supabase migration in the hosted
 * project, and also executed by the app's self-heal path / `npm run db:init`
 * for fresh local databases.
 */
export const DDL = `
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('systemic_rep','dept_manager','standard_user','read_only','external_consultant','platform_support')),
  department TEXT,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  twofa_enabled SMALLINT NOT NULL DEFAULT 1,
  license_no TEXT,
  consultant_expires_at TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','expired','cancelled','accepted')),
  expires_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  case_number TEXT NOT NULL,
  title TEXT NOT NULL,
  court TEXT NOT NULL,
  stage TEXT NOT NULL,
  assigned_expert_id TEXT REFERENCES users(id),
  court_deadline_at TEXT,
  delivered SMALLINT NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parties (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  note TEXT,
  confidence INTEGER,
  approved SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  case_id TEXT NOT NULL REFERENCES cases(id),
  ref TEXT NOT NULL,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('documented','analyzing','disputed','quarantined')),
  scan_status TEXT NOT NULL DEFAULT 'clean' CHECK (scan_status IN ('pending','clean','infected')),
  party_label TEXT,
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_blobs (
  sha256 TEXT PRIMARY KEY,
  quarantined SMALLINT NOT NULL DEFAULT 0,
  bytes BYTEA NOT NULL
);

CREATE TABLE IF NOT EXISTS custody_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evidence_id TEXT NOT NULL REFERENCES evidence(id),
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  at TEXT NOT NULL,
  prev_hash TEXT,
  event_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS obligations (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  clause TEXT NOT NULL,
  responsible TEXT NOT NULL,
  status TEXT NOT NULL,
  evidence_refs TEXT NOT NULL DEFAULT '[]',
  confidence INTEGER NOT NULL,
  decision TEXT NOT NULL DEFAULT 'suggested' CHECK (decision IN ('suggested','approved','rejected')),
  decided_by TEXT,
  decided_at TEXT
);

CREATE TABLE IF NOT EXISTS conclusions (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  number TEXT NOT NULL,
  section_label TEXT NOT NULL,
  section_title TEXT NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved')),
  citations TEXT NOT NULL DEFAULT '[]',
  trace_considered TEXT,
  trace_excluded TEXT,
  trace_rationale TEXT,
  approved_by TEXT,
  approved_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_id TEXT,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  actor TEXT NOT NULL,
  ip TEXT,
  at TEXT NOT NULL,
  prev_hash TEXT,
  event_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login','step_up')),
  action_label TEXT,
  code TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','locked','expired')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS step_up_tokens (
  jti TEXT PRIMARY KEY,
  used SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ai_providers (
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  label TEXT NOT NULL,
  model TEXT NOT NULL,
  enabled SMALLINT NOT NULL DEFAULT 0,
  locked SMALLINT NOT NULL DEFAULT 0,
  scope TEXT NOT NULL DEFAULT 'workspace',
  PRIMARY KEY (tenant_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_custody_evidence ON custody_events(evidence_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_obligations_case ON obligations(case_id);
CREATE INDEX IF NOT EXISTS idx_conclusions_case ON conclusions(case_id);
`;
