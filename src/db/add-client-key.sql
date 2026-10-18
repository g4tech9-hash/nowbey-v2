-- Idempotency for the offline send queue (2026-10-18).
--
-- Why: a phone that cannot hear the server cannot tell whether its report arrived. Without a key, retrying is a
-- gamble between losing the report and pinning it twice. The app now generates a key at compose time and sends
-- it with every attempt; this table remembers which ones already produced a report.
--
-- RUN THIS BEFORE DEPLOYING THE SCHEMA THAT READS IT. `incidents` is selected with an explicit column list
-- generated from drizzle's schema, so a deploy that knows about client_key while the database does not will
-- fail every incident query — reads included, not just writes.
--
-- Safe to run more than once.

BEGIN;

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS client_key text;

-- Partial unique index: NULL (every report that arrived without a key, including all historical rows and the
-- website before this change) must not collide with itself, and must not be treated as a duplicate of anything.
CREATE UNIQUE INDEX IF NOT EXISTS incidents_client_key_idx
  ON incidents (client_key)
  WHERE client_key IS NOT NULL;

COMMIT;

-- Verification: returns one column plus one index.
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'client_key';
--   SELECT indexname FROM pg_indexes WHERE tablename = 'incidents' AND indexname = 'incidents_client_key_idx';
