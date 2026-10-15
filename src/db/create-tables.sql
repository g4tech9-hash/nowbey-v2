-- Creates every NowBey table. Safe to run more than once.
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL UNIQUE,
  display_name text NOT NULL,
  email text,
  password_hash text,
  role text NOT NULL DEFAULT 'resident',
  parish text,
  ad_free_tier text,
  plan_interval text,
  plan_status text,
  plan_renews_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  email_verified_at timestamptz,
  session_version integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  suspended_reason text,
  suspended_at timestamptz,
  last_login_at timestamptz,
  password_changed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email);

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  details text,
  category text NOT NULL DEFAULT 'notice',
  severity integer NOT NULL DEFAULT 2,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy_meters double precision,
  address text,
  street text,
  parish text,
  status text NOT NULL DEFAULT 'active',
  confirmations integer NOT NULL DEFAULT 0,
  sightings integer NOT NULL DEFAULT 0,
  source_kind text NOT NULL DEFAULT 'resident',
  source_name text,
  source_url text,
  photo_note text,
  user_id uuid,
  author_handle text,
  anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS incidents_created_idx ON incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents (status);
CREATE INDEX IF NOT EXISTS incidents_parish_idx ON incidents (parish);

CREATE TABLE IF NOT EXISTS incident_updates (
  id serial PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'note',
  note text,
  author_handle text,
  actor_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS incident_updates_incident_idx ON incident_updates (incident_id);

CREATE TABLE IF NOT EXISTS news_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  url text NOT NULL UNIQUE,
  source_name text NOT NULL DEFAULT 'NowBey Wire',
  image_url text,
  parish text,
  lat double precision,
  lng double precision,
  geocoded boolean NOT NULL DEFAULT false,
  category text NOT NULL DEFAULT 'news',
  published_at timestamptz NOT NULL DEFAULT now(),
  ingested_at timestamptz NOT NULL DEFAULT now(),
  review text NOT NULL DEFAULT 'approved',
  alert_level text NOT NULL DEFAULT 'none',
  alerted_at timestamptz
);
CREATE INDEX IF NOT EXISTS news_published_idx ON news_items (published_at DESC);

CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id serial PRIMARY KEY,
  channel text NOT NULL DEFAULT 'email',
  target text NOT NULL,
  parishes text NOT NULL DEFAULT 'New Providence',
  categories text NOT NULL DEFAULT '',
  radius_km integer NOT NULL DEFAULT 12,
  lat double precision,
  lng double precision,
  active boolean NOT NULL DEFAULT true,
  verified boolean NOT NULL DEFAULT false,
  token text,
  user_id uuid,
  verified_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alert_token_idx ON alert_subscriptions (token);
CREATE INDEX IF NOT EXISTS alert_target_idx ON alert_subscriptions (target);

CREATE TABLE IF NOT EXISTS enterprise_inquiries (
  id serial PRIMARY KEY,
  organisation text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  team_size text,
  message text,
  status text NOT NULL DEFAULT 'new',
  handled_at timestamptz,
  notified_at timestamptz,
  notify_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_log (
  id serial PRIMARY KEY,
  to_addr text NOT NULL,
  subject text NOT NULL,
  kind text NOT NULL DEFAULT 'other',
  status text NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_tokens (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  email text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_tokens_user_idx ON account_tokens (user_id);

CREATE TABLE IF NOT EXISTS admin_audit (
  id serial PRIMARY KEY,
  actor_handle text NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  target_label text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit (created_at DESC);

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_handle text NOT NULL,
  kind text NOT NULL,
  place_name text,
  title text NOT NULL,
  body text NOT NULL,
  rating integer,
  price_level integer,
  parish text,
  lat double precision,
  lng double precision,
  street text,
  status text NOT NULL DEFAULT 'published',
  flag_count integer NOT NULL DEFAULT 0,
  photo_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_created_idx ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_kind_idx ON posts (kind);
CREATE INDEX IF NOT EXISTS posts_parish_idx ON posts (parish);
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts (status);
CREATE INDEX IF NOT EXISTS posts_user_idx ON posts (user_id);

CREATE TABLE IF NOT EXISTS post_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  data bytea NOT NULL,
  thumb bytea NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  bytes integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS post_photos_post_idx ON post_photos (post_id);

CREATE TABLE IF NOT EXISTS post_flags (
  id serial PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  actor_key text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS post_flags_unique_idx ON post_flags (post_id, actor_key);

CREATE TABLE IF NOT EXISTS reactions (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE,
  news_id uuid REFERENCES news_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reactions_one_target CHECK (num_nonnulls(post_id, incident_id, news_id) = 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS reactions_post_user_idx ON reactions (post_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS reactions_incident_user_idx ON reactions (incident_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS reactions_news_user_idx ON reactions (news_id, user_id);
CREATE INDEX IF NOT EXISTS reactions_user_idx ON reactions (user_id);

CREATE TABLE IF NOT EXISTS comments (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  author_handle text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'published',
  parent_id integer REFERENCES comments(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE,
  news_id uuid REFERENCES news_items(id) ON DELETE CASCADE,
  flag_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comments_one_target CHECK (num_nonnulls(post_id, incident_id, news_id) = 1)
);
CREATE INDEX IF NOT EXISTS comments_post_idx ON comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS comments_incident_idx ON comments (incident_id, created_at);
CREATE INDEX IF NOT EXISTS comments_news_idx ON comments (news_id, created_at);
CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments (parent_id);
CREATE INDEX IF NOT EXISTS comments_user_idx ON comments (user_id);

CREATE TABLE IF NOT EXISTS comment_flags (
  id serial PRIMARY KEY,
  comment_id integer NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  actor_key text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS comment_flags_unique_idx ON comment_flags (comment_id, actor_key);

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

-- Places (see add-places.sql for the upgrade of an existing database)
CREATE TABLE IF NOT EXISTS places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL,
  parish text NOT NULL,
  address text,
  lat double precision,
  lng double precision,
  hours text,
  menu_text text,
  last_edited_by text,
  source text,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS places_kind_idx ON places (kind, parish);
CREATE UNIQUE INDEX IF NOT EXISTS places_external_idx ON places (external_id);

CREATE TABLE IF NOT EXISTS place_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'photo',
  position integer NOT NULL DEFAULT 0,
  data bytea NOT NULL,
  thumb bytea NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  bytes integer NOT NULL,
  uploaded_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS place_photos_place_idx ON place_photos (place_id);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS place_id uuid REFERENCES places(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS posts_place_idx ON posts (place_id);
CREATE TABLE IF NOT EXISTS device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS device_tokens_user_token_idx ON device_tokens (user_id, token);

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

