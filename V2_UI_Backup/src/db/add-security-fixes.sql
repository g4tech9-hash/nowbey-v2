-- Security fixes, 2026-10-15. Additive and safe to run more than once.
--
-- Creates the shared rate-limit table used by sign-in, sign-up, password-reset and password-check
-- limits (src/lib/ratelimit.ts → sharedHit / sharedExhausted / sharedRecord / sharedForget).
--
-- Until this has run, the site keeps working: those limits fall back to the old per-instance counts
-- and the server log says "table rate_limits is missing" once per instance. Nothing else reads it.
--
-- Run once in the Neon SQL editor (paste the statements below and press Run), or locally:
--   psql "$DATABASE_URL" -f src/db/add-security-fixes.sql
--
-- To confirm it landed:
--   select count(*) from information_schema.tables where table_name = 'rate_limits';   -- expect 1

BEGIN;

CREATE TABLE IF NOT EXISTS rate_limits (
  key        text PRIMARY KEY,
  hits       integer NOT NULL DEFAULT 1,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_expires_idx ON rate_limits (expires_at);

COMMIT;

-- Removes the invented gas prices the old daily job inserted (src/app/api/cron/gas-update): rows with no
-- member behind them (user_id IS NULL) at exactly the three hard-coded station/price pairs. Member reports
-- always carry a user_id, so none can match. The Gas tracker is switched off for the Nassau launch, so
-- nobody has seen these; this keeps them from appearing the day it is switched on.
DELETE FROM gas_reports
WHERE user_id IS NULL
  AND fuel = 'regular'
  AND parish = 'New Providence'
  AND (station, price_cents) IN (('Shell', 708), ('Esso', 750), ('Rubis', 756));
