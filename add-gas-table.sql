CREATE TABLE IF NOT EXISTS gas_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  station text NOT NULL,
  parish text NOT NULL,
  fuel text NOT NULL,
  price_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gas_reports_recent_idx ON gas_reports (parish, fuel, created_at DESC);
