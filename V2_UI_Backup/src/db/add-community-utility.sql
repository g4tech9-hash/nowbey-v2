-- Everyday/post-storm utility status. Safe to run repeatedly.
CREATE TABLE IF NOT EXISTS service_statuses (
  id serial PRIMARY KEY,
  name text NOT NULL,
  kind text NOT NULL,
  parish text NOT NULL DEFAULT 'New Providence',
  address text,
  status text NOT NULL DEFAULT 'unknown',
  note text,
  source_name text,
  source_url text,
  verified boolean NOT NULL DEFAULT false,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);
CREATE INDEX IF NOT EXISTS service_statuses_parish_idx ON service_statuses (parish, status);
CREATE INDEX IF NOT EXISTS service_statuses_updated_idx ON service_statuses (updated_at DESC);
