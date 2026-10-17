-- Resident pin privacy (see src/lib/location-privacy.ts and docs/AUDIT_2026-10-17.md, C2).
-- RUN ONCE, AFTER A BACKUP. The coarsening below overwrites stored coordinates and cannot be undone
-- from the database; the exact spots are lost unless you keep the backup.
-- Safe to run the schema part twice. The UPDATE only touches rows not yet approximated, so a second run changes nothing.

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS pin_approximated boolean NOT NULL DEFAULT false;

-- Preview first: how many resident pins would move.
-- SELECT count(*) FROM incidents WHERE source_kind = 'resident' AND pin_approximated = false;

BEGIN;

-- One random angle and one random distance per row (30 to 60 m), shared by latitude and longitude.
WITH r AS (
  SELECT id,
         random() * 2 * pi() AS angle,
         30 + random() * 30 AS metres
    FROM incidents
   WHERE source_kind = 'resident' AND pin_approximated = false
)
UPDATE incidents i
   SET lat = round((i.lat + (r.metres * cos(r.angle)) / 111320.0)::numeric, 6),
       lng = round((i.lng + (r.metres * sin(r.angle)) / (111320.0 * cos(radians(i.lat))))::numeric, 6),
       accuracy_meters = greatest(coalesce(i.accuracy_meters, 0), r.metres),
       pin_approximated = true
  FROM r
 WHERE i.id = r.id;

COMMIT;
