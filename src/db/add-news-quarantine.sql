-- News quarantine queue, 2026-10-18. Additive and safe to run more than once.
--
-- The wire was publishing whatever a Google News search returned, including
-- directory pages and gambling promotions ("Profile : taixiushopnet"). The
-- ingest now screens every candidate (src/lib/news-filter.ts) and holds the
-- ones that fail instead of dropping them silently.
--
-- This table is that holding pen. A row is a story we did NOT publish, with the
-- reason we held it. A human decides: "approved" means it was good and is now
-- on the wire; "rejected" means it stays out.
--
-- Until this has run, the site keeps working: the filter still holds the junk,
-- the queue just cannot record it, and the server log says so once per run.
--
-- Run once in the Neon SQL editor (paste the statements below and press Run), or locally:
--   psql "$DATABASE_URL" -f src/db/add-news-quarantine.sql
--
-- To confirm it landed:
--   select count(*) from information_schema.tables where table_name = 'news_quarantine';  -- expect 1

BEGIN;

CREATE TABLE IF NOT EXISTS news_quarantine (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  url           text NOT NULL,
  source_name   text NOT NULL DEFAULT '',
  reason        text NOT NULL,
  detail        text,
  published_at  timestamptz,
  quarantined_at timestamptz NOT NULL DEFAULT now(),
  review        text NOT NULL DEFAULT 'held'
);

CREATE INDEX IF NOT EXISTS news_quarantine_review_idx ON news_quarantine (review);
CREATE UNIQUE INDEX IF NOT EXISTS news_quarantine_url_idx ON news_quarantine (url);

-- The placement of a story: "street" (a named place was found in the text),
-- "island" (only the island could be worked out, so the pin is the middle of
-- the island) or "none". The wire shows an island-level pin hollow and says
-- "approximate", and never prints four-decimal coordinates for it.
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'none';

-- Stories placed before this column existed are street-level if they were
-- geocoded, and island-level if they only have coordinates from the parish.
UPDATE news_items
SET placement = CASE WHEN geocoded THEN 'street' WHEN lat IS NOT NULL THEN 'island' ELSE 'none' END
WHERE placement = 'none';

COMMIT;

-- The junk that got through before the filter existed. Held, not deleted: an
-- editor can look at the list and decide. Every one of these is a directory
-- page, a casino promotion or a printing artefact, not a Bahamian news story.
INSERT INTO news_quarantine (title, url, source_name, reason, detail, review)
SELECT
  title,
  url,
  source_name,
  CASE
    WHEN title ~* '^\s*(profile\s*:|search results for\s*:)' THEN 'junk-title'
    WHEN title ~* '\bcutout\b|\be-?edition\b'                  THEN 'cutout'
    WHEN title ~* '\b(taixiu|iwin|sc88|mm99|bl555|nohu|llwin|slot|casino)\b' THEN 'gambling'
    ELSE 'junk-title'
  END AS reason,
  title AS detail,
  'held'
FROM news_items
WHERE title ~* '^\s*(profile\s*:|search results for\s*:)'
   OR title ~* '\bcutout\b|\be-?edition\b'
   OR title ~* '\b(taixiu|iwin|sc88|mm99|bl555|nohu|llwin|slot|casino)\b'
ON CONFLICT (url) DO NOTHING;

-- Hide the rows that were held. They stay in the table, and the admin queue
-- can still find them, but they are no longer "approved" and cannot be served
-- to a reader.
UPDATE news_items
SET review = 'quarantined'
WHERE review = 'approved'
  AND (
    title ~* '^\s*(profile\s*:|search results for\s*:)'
    OR title ~* '\bcutout\b|\be-?edition\b'
    OR title ~* '\b(taixiu|iwin|sc88|mm99|bl555|nohu|llwin|slot|casino)\b'
  );
