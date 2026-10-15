-- Member profiles, contributions, staff notes and badges. Additive and safe to run more than once.
--
-- Run once in the Neon SQL editor (or against a local database):
--   psql "$DATABASE_URL" -f src/db/add-profiles.sql
--
-- In Neon: open the SQL editor for the database, paste this whole file, and run it. It only creates things;
-- it never drops, never rewrites and never changes an existing row, so running it twice is harmless and
-- running it on a busy database is safe.
--
-- Why every one of these is a new table and not a new column:
--   The app reads whole rows with `select *` in the sign-in route, the password reset, the report pages and
--   the feed. A column added to `users` or `incidents` would make every one of those pages fail on a database
--   where this file had not been run yet. A new table can only affect the pages that are about profiles, and
--   those pages are the only ones that lose anything until this runs.
--
-- What each piece is for:
--   member_profiles           One row per member, created the first time they change a setting.
--                             visibility 'open' (default, also the meaning of "no row") or 'private'.
--                             A private profile is invisible to every other member. bio is one optional
--                             line, 200 characters. show_alert_summary is opt-in and shows only a count of
--                             islands — never the email address, never the categories.
--   hidden_profile_reports    A report its author keeps off their profile. The report itself does not move:
--                             it stays on the map, keeps its confirmations and still counts toward the
--                             record. Only the listing by name stops.
--   member_notes              Staff notebook, append-only, never shown to the member.
--   badge_grants              Human-granted badges, with a reason, an optional expiry and a revocation.
--                             "verified" means a person checked the account. It is not for sale.

BEGIN;

CREATE TABLE IF NOT EXISTS member_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'open',
  bio text,
  show_alert_summary boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hidden_profile_reports (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  hidden_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS hidden_profile_reports_user_incident_idx ON hidden_profile_reports (user_id, incident_id);
CREATE INDEX IF NOT EXISTS hidden_profile_reports_user_idx ON hidden_profile_reports (user_id);

CREATE TABLE IF NOT EXISTS member_notes (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_handle text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS member_notes_user_idx ON member_notes (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS badge_grants (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge text NOT NULL,
  reason text NOT NULL,
  granted_by text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by text
);
CREATE INDEX IF NOT EXISTS badge_grants_user_idx ON badge_grants (user_id);

-- A profile reads one member's own reports and confirmations by id, which the launch tables had no index for.
CREATE INDEX IF NOT EXISTS incidents_user_idx ON incidents (user_id);
CREATE INDEX IF NOT EXISTS incident_updates_actor_idx ON incident_updates (actor_key);

COMMIT;
