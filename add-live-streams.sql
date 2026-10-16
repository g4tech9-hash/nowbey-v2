-- Live broadcaster streams for Content Moderation (/admin/streams). Safe to run more than once.
-- Run in the Neon SQL editor (or psql) BEFORE deploying the code that reads it.
BEGIN;

CREATE TABLE IF NOT EXISTS live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_handle text NOT NULL,
  title text NOT NULL,
  incident_id uuid REFERENCES incidents(id) ON DELETE SET NULL,
  playback_url text,
  status text NOT NULL DEFAULT 'live',
  kill_reason text,
  killed_by text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  CONSTRAINT live_streams_status_chk CHECK (status IN ('live', 'ended', 'killed'))
);

CREATE INDEX IF NOT EXISTS live_streams_status_idx ON live_streams(status);
CREATE INDEX IF NOT EXISTS live_streams_user_idx ON live_streams(user_id);

COMMIT;
