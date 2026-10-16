-- Banned-device list for User Management ("Ban Device"). Safe to run more than once.
-- Stores only SHA-256 fingerprints of push tokens, never the tokens themselves.
-- Run in the Neon SQL editor (or psql) BEFORE deploying the code that reads it.
BEGIN;

CREATE TABLE IF NOT EXISTS banned_devices (
  id serial PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  platform text,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reason text,
  banned_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS banned_devices_user_idx ON banned_devices(user_id);

COMMIT;
