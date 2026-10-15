-- AI story briefs + push alerts + Community Digest drafts. Safe to re-run.
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS ai_at timestamptz;

CREATE TABLE IF NOT EXISTS push_tokens (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'web',
  parishes text NOT NULL DEFAULT 'New Providence',
  categories text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  last_push_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_token_idx ON push_tokens (token);
CREATE INDEX IF NOT EXISTS push_tokens_active_idx ON push_tokens (active);

CREATE TABLE IF NOT EXISTS digest_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parish text NOT NULL,
  categories text NOT NULL DEFAULT '',
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text NOT NULL,
  recipients text NOT NULL DEFAULT '',
  item_count integer NOT NULL DEFAULT 0,
  generated_by text NOT NULL DEFAULT 'plain',
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS digest_drafts_created_idx ON digest_drafts (created_at DESC);
