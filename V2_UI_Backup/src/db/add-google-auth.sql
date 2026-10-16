-- Sign in with Google. Additive and safe to run more than once.
--
-- The column stores Google's stable subject id ("sub"), which is what makes an account openable with
-- the Google button. It is NULL for every account that has not linked Google, and Postgres allows any
-- number of NULLs through a unique index, so existing rows are unaffected.
--
-- Run once in the Neon SQL editor (or against a local database) before the Google button is switched on:
--   psql "$DATABASE_URL" -f src/db/add-google-auth.sql

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub text;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_idx ON users (google_sub);

COMMIT;
