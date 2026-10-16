-- Optional profile photos, separate from users so existing sign-in queries remain compatible.
CREATE TABLE IF NOT EXISTS member_avatars (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
