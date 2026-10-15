-- AI log analysis + approval handoff (extends add-client-errors.sql). Safe to re-run.
-- After running: set GEMINI_API_KEY (AI diagnosis) and GITHUB_TOKEN + GITHUB_REPO
-- (approved proposals become GitHub issues) in the server environment, then schedule
-- /api/cron/error-analysis alongside the other crons. Everything degrades honestly
-- without them: logs still collect, analyses wait as "unavailable", approvals wait as "approved".

ALTER TABLE client_errors ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'web';
ALTER TABLE client_errors ADD COLUMN IF NOT EXISTS app_version text;
ALTER TABLE client_errors ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE client_errors ADD COLUMN IF NOT EXISTS context text;

CREATE TABLE IF NOT EXISTS error_analyses (
  id serial PRIMARY KEY,
  error_id integer NOT NULL REFERENCES client_errors(id) ON DELETE CASCADE,
  digest text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review',
  severity text NOT NULL DEFAULT 'low',
  summary text NOT NULL,
  likely_cause text,
  suggested_fix text,
  affected_area text,
  confidence text NOT NULL DEFAULT 'low',
  model text,
  analyzed_count integer NOT NULL DEFAULT 0,
  github_issue_number integer,
  github_issue_url text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS error_analyses_error_idx ON error_analyses (error_id);
CREATE INDEX IF NOT EXISTS error_analyses_status_idx ON error_analyses (status);
