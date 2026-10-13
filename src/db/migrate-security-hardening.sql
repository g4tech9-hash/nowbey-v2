-- Security hardening: hashed alert tokens + nullable system gas prices.
-- Apply with psql / drizzle-kit push. Safe to run twice (IF NOT EXISTS).

ALTER TABLE gas_reports ALTER COLUMN user_id DROP NOT NULL;
DO $$ BEGIN
  ALTER TABLE gas_reports DROP CONSTRAINT IF EXISTS gas_reports_user_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE gas_reports ADD CONSTRAINT gas_reports_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE alert_subscriptions ADD COLUMN IF NOT EXISTS token_hash text;
ALTER TABLE alert_subscriptions ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS alert_token_hash_idx ON alert_subscriptions (token_hash) WHERE token_hash IS NOT NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill hashes for unexpired legacy plaintext tokens (run once, then clear token column):
-- UPDATE alert_subscriptions SET token_hash = encode(digest(token,'sha256'),'hex') WHERE token_hash IS NULL AND token IS NOT NULL;
