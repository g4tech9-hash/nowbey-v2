-- One-time move of Island Life likes and comments into the shared reactions and comments tables.
-- Safe to run more than once. Run it BEFORE the old post_likes / post_comments tables are removed
-- (the schema push that ships with this change removes them), for example:
--   psql "$DATABASE_URL" -f src/db/migrate-engagement.sql
BEGIN;

INSERT INTO reactions (user_id, kind, post_id, created_at)
SELECT user_id, 'like', post_id, created_at FROM post_likes
ON CONFLICT (post_id, user_id) DO NOTHING;

INSERT INTO comments (user_id, author_handle, body, post_id, created_at)
SELECT c.user_id, c.author_handle, c.body, c.post_id, c.created_at
FROM post_comments c
WHERE NOT EXISTS (
  SELECT 1 FROM comments x
  WHERE x.post_id = c.post_id AND x.user_id = c.user_id AND x.body = c.body AND x.created_at = c.created_at
)
ORDER BY c.id;

COMMIT;
