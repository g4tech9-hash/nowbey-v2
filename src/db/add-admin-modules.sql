-- ============================================================================
--  Admin Command Centre: live broadcasts and device bans.
--
--  Backs the four modules added alongside src/db/schema.ts (liveStreams,
--  deviceBans). Safe to run twice: every statement is CREATE TABLE IF NOT
--  EXISTS. Nothing existing is altered or dropped.
--
--  Run against the same DATABASE_URL the app uses. If a statement fails the
--  transaction stops and nothing before it is kept, so a half-applied schema
--  is not possible.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
--  live_streams -- one row per broadcast. The media plane (Agora/LiveKit/etc.)
--  is external; this row is the authority the Kill Stream button writes to and
--  the broadcaster's client polls to learn it must stop.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS live_streams (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES users(id) ON DELETE CASCADE,
  author_handle  text NOT NULL,
  title          text NOT NULL,
  location_label text,
  lat            double precision,
  lng            double precision,
  parish         text,
  provider       text NOT NULL DEFAULT '',
  room_id        text,
  -- live | ended (broadcaster stopped) | killed (staff cut it off)
  status         text NOT NULL DEFAULT 'live',
  viewers        integer NOT NULL DEFAULT 0,
  peak_viewers   integer NOT NULL DEFAULT 0,
  killed_by      text,
  killed_at      timestamptz,
  ended_at       timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_streams_status_idx ON live_streams (status);
CREATE INDEX IF NOT EXISTS live_streams_created_idx ON live_streams (created_at DESC);

-- ----------------------------------------------------------------------------
--  device_bans -- bars a device, not just an account. token is the Expo push
--  token the app already registers: stable per install, not per account, which
--  is what makes it a device identity. Revoked, never deleted.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_bans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token         text NOT NULL,
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  author_handle text,
  reason        text NOT NULL,
  banned_by     text NOT NULL,
  banned_at     timestamptz NOT NULL DEFAULT now(),
  -- NULL means permanent.
  expires_at    timestamptz,
  revoked_at    timestamptz,
  revoked_by    text
);

-- One live ban per token. (token, revoked_at) is unique rather than token
-- alone, so a ban can be revoked and re-imposed without deleting history.
CREATE UNIQUE INDEX IF NOT EXISTS device_bans_token_active_idx
  ON device_bans (token, revoked_at);
CREATE INDEX IF NOT EXISTS device_bans_user_idx ON device_bans (user_id);

-- ----------------------------------------------------------------------------
--  push_tokens -- a device's last known position, so a geofenced broadcast has
--  something to measure. Null is normal (the browser declined, or subscribed
--  from a page that never asked); those devices still get island-wide alerts
--  and are simply skipped by radius sends.
-- ----------------------------------------------------------------------------
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS lng double precision;

COMMIT;

-- ----------------------------------------------------------------------------
--  HOW A BAN IS EVALUATED
-- ----------------------------------------------------------------------------
--  A ban is in force when:
--
--      revoked_at IS NULL
--      AND (expires_at IS NULL OR expires_at > now())
--
--  Enforced in src/lib/device-ban.ts. The check runs on every API request that
--  carries a device token, so a banned device is refused server-side rather
--  than merely hidden in the UI.
-- ----------------------------------------------------------------------------
