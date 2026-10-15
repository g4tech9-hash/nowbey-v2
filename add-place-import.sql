-- Run once in the Neon SQL Editor (production branch) before deploying the venue import.
-- Adds where a listing came from and its source id, so an import can be run again without duplicates.
ALTER TABLE places ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE places ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE places ADD COLUMN IF NOT EXISTS image_urls text;
ALTER TABLE places ADD COLUMN IF NOT EXISTS menu_link text;
ALTER TABLE places ADD COLUMN IF NOT EXISTS contact_number text;
ALTER TABLE places ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE places ADD COLUMN IF NOT EXISTS social_links text;
CREATE UNIQUE INDEX IF NOT EXISTS places_external_idx ON places (external_id);
