-- ARMS relational PostgreSQL bootstrap (Supabase or any Postgres) + Vercel.
-- No demo employees, projects, boxes, dossiers, notifications or audit events are seeded.

CREATE TABLE IF NOT EXISTS arms_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('System Admin','Archive Manager','Data Entry','Viewer')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash TEXT NOT NULL,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS arms_users_active_idx ON arms_users(active);

-- Revision row provides optimistic concurrency control between browser sessions.
CREATE TABLE IF NOT EXISTS arms_app_state (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE arms_app_state ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 0;
-- Remove the legacy monolithic JSONB snapshot from the earlier scaffold; the normalized tables below are authoritative.
ALTER TABLE arms_app_state DROP COLUMN IF EXISTS state;
INSERT INTO arms_app_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
CREATE INDEX IF NOT EXISTS arms_app_state_updated_at_idx ON arms_app_state(updated_at DESC);

-- Normalized archive entities. JSONB stores each record's complete UI metadata,
-- while keys and foreign keys enforce the physical archive relationships.
CREATE TABLE IF NOT EXISTS arms_boxes (
  box_code TEXT PRIMARY KEY,
  first_job_id BIGINT NOT NULL UNIQUE,
  last_job_id BIGINT NOT NULL,
  data JSONB NOT NULL,
  CHECK (last_job_id = first_job_id + 299)
);
CREATE TABLE IF NOT EXISTS arms_dossiers (
  dossier_id TEXT PRIMARY KEY,
  box_code TEXT NOT NULL REFERENCES arms_boxes(box_code) ON DELETE CASCADE,
  dossier_number SMALLINT NOT NULL CHECK (dossier_number BETWEEN 1 AND 6),
  data JSONB NOT NULL,
  UNIQUE (box_code, dossier_number)
);
CREATE TABLE IF NOT EXISTS arms_projects (
  job_id BIGINT PRIMARY KEY,
  box_code TEXT NOT NULL REFERENCES arms_boxes(box_code) ON DELETE CASCADE,
  dossier_id TEXT NOT NULL REFERENCES arms_dossiers(dossier_id) ON DELETE CASCADE,
  dossier_number SMALLINT NOT NULL CHECK (dossier_number BETWEEN 1 AND 6),
  slot_index SMALLINT NOT NULL CHECK (slot_index BETWEEN 0 AND 49),
  data JSONB NOT NULL,
  UNIQUE (box_code, dossier_number, slot_index)
);
CREATE INDEX IF NOT EXISTS arms_projects_box_idx ON arms_projects(box_code, dossier_number, slot_index);
CREATE INDEX IF NOT EXISTS arms_projects_status_idx ON arms_projects((data->>'status'));
CREATE INDEX IF NOT EXISTS arms_projects_date_approved_idx ON arms_projects((data->>'dateApproved'));

CREATE TABLE IF NOT EXISTS arms_upload_history (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS arms_notifications (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS arms_audit_logs (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL
);

-- Brute-force protection for password authentication.
CREATE TABLE IF NOT EXISTS arms_login_attempts (
  username TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Atomic full-state synchronization with differential UPSERTs and stale-row deletion.
-- The function updates only changed entity rows; concurrent stale writers receive SQLSTATE 40001.
CREATE OR REPLACE FUNCTION arms_save_state(p_state JSONB, p_expected_revision BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_revision BIGINT;
BEGIN
  UPDATE arms_app_state
     SET revision = revision + 1, updated_at = NOW()
   WHERE id = 1 AND revision = p_expected_revision
   RETURNING revision INTO v_revision;

  IF v_revision IS NULL THEN
    RAISE EXCEPTION 'ARMS_REVISION_CONFLICT' USING ERRCODE = '40001';
  END IF;

  INSERT INTO arms_boxes (box_code, first_job_id, last_job_id, data)
  SELECT x.data->>'boxCode', (x.data->>'firstJobId')::BIGINT, (x.data->>'lastJobId')::BIGINT, x.data
    FROM jsonb_array_elements(COALESCE(p_state->'boxes', '[]'::JSONB)) AS x(data)
  ON CONFLICT (box_code) DO UPDATE SET
    first_job_id = EXCLUDED.first_job_id, last_job_id = EXCLUDED.last_job_id, data = EXCLUDED.data
  WHERE arms_boxes.data IS DISTINCT FROM EXCLUDED.data;

  INSERT INTO arms_dossiers (dossier_id, box_code, dossier_number, data)
  SELECT x.data->>'id', x.data->>'boxId', (x.data->>'dossierNumber')::SMALLINT, x.data
    FROM jsonb_array_elements(COALESCE(p_state->'dossiers', '[]'::JSONB)) AS x(data)
  ON CONFLICT (dossier_id) DO UPDATE SET
    box_code = EXCLUDED.box_code, dossier_number = EXCLUDED.dossier_number, data = EXCLUDED.data
  WHERE arms_dossiers.data IS DISTINCT FROM EXCLUDED.data;

  INSERT INTO arms_projects (job_id, box_code, dossier_id, dossier_number, slot_index, data)
  SELECT (x.data->>'jobId')::BIGINT,
         x.data->>'boxId',
         (x.data->>'boxId') || '-' || (x.data->>'dossierNumber'),
         (x.data->>'dossierNumber')::SMALLINT,
         (x.data->>'slotIndex')::SMALLINT,
         x.data
    FROM jsonb_array_elements(COALESCE(p_state->'projects', '[]'::JSONB)) AS x(data)
  ON CONFLICT (job_id) DO UPDATE SET
    box_code = EXCLUDED.box_code, dossier_id = EXCLUDED.dossier_id,
    dossier_number = EXCLUDED.dossier_number, slot_index = EXCLUDED.slot_index, data = EXCLUDED.data
  WHERE arms_projects.data IS DISTINCT FROM EXCLUDED.data;

  DELETE FROM arms_projects p
   WHERE NOT EXISTS (
     SELECT 1 FROM jsonb_array_elements(COALESCE(p_state->'projects', '[]'::JSONB)) AS x(data)
      WHERE (x.data->>'jobId')::BIGINT = p.job_id
   );
  DELETE FROM arms_dossiers d
   WHERE NOT EXISTS (
     SELECT 1 FROM jsonb_array_elements(COALESCE(p_state->'dossiers', '[]'::JSONB)) AS x(data)
      WHERE x.data->>'id' = d.dossier_id
   );
  DELETE FROM arms_boxes b
   WHERE NOT EXISTS (
     SELECT 1 FROM jsonb_array_elements(COALESCE(p_state->'boxes', '[]'::JSONB)) AS x(data)
      WHERE x.data->>'boxCode' = b.box_code
   );

  INSERT INTO arms_upload_history (id, data)
  SELECT x.data->>'id', x.data FROM jsonb_array_elements(COALESCE(p_state->'uploadHistory', '[]'::JSONB)) AS x(data)
  ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data WHERE arms_upload_history.data IS DISTINCT FROM EXCLUDED.data;
  DELETE FROM arms_upload_history h WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(p_state->'uploadHistory', '[]'::JSONB)) AS x(data) WHERE x.data->>'id' = h.id);

  INSERT INTO arms_notifications (id, data)
  SELECT x.data->>'id', x.data FROM jsonb_array_elements(COALESCE(p_state->'notifications', '[]'::JSONB)) AS x(data)
  ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data WHERE arms_notifications.data IS DISTINCT FROM EXCLUDED.data;
  DELETE FROM arms_notifications n WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(p_state->'notifications', '[]'::JSONB)) AS x(data) WHERE x.data->>'id' = n.id);

  INSERT INTO arms_audit_logs (id, data)
  SELECT x.data->>'id', x.data FROM jsonb_array_elements(COALESCE(p_state->'auditLogs', '[]'::JSONB)) AS x(data)
  ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data WHERE arms_audit_logs.data IS DISTINCT FROM EXCLUDED.data;
  DELETE FROM arms_audit_logs a WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(p_state->'auditLogs', '[]'::JSONB)) AS x(data) WHERE x.data->>'id' = a.id);

  RETURN v_revision;
END;
$$;
