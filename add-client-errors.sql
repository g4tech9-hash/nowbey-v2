-- Self-hosted error tracking (beta readiness). Safe to re-run.
CREATE TABLE IF NOT EXISTS client_errors (
  id serial PRIMARY KEY,
  digest text NOT NULL,
  kind text NOT NULL DEFAULT 'client',
  message text NOT NULL,
  stack text,
  url text,
  handle text,
  user_agent text,
  count integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS client_errors_digest_idx ON client_errors (digest);
CREATE INDEX IF NOT EXISTS client_errors_seen_idx ON client_errors (last_seen_at DESC);
