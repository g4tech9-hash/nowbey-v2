-- Canned demo photo-note cleanup (see src/lib/report-utils.ts CANNED_PHOTO_NOTES and
-- REFINEMENT_REPORT.md remaining risk 9). The UI already suppresses these notes; this
-- migration removes them from the database itself so exported data and the API stop
-- carrying demo text.
-- RUN ONCE, AFTER A BACKUP. Idempotent: the UPDATE only touches rows that still match.
-- Safe to run the schema part twice. Mirrors the matcher exactly: case-insensitive
-- substring match on the two canned phrases.

-- Preview first: how many rows still carry a canned note.
SELECT id, title, photo_note
FROM incidents
WHERE photo_note IS NOT NULL
  AND (
    lower(photo_note) LIKE '%water up to the first step of the shelter%'
    OR lower(photo_note) LIKE '%water up to the first step%'
  );

-- Clear the canned notes (keep the rows — only the demo text goes).
UPDATE incidents
SET photo_note = NULL
WHERE photo_note IS NOT NULL
  AND (
    lower(photo_note) LIKE '%water up to the first step of the shelter%'
    OR lower(photo_note) LIKE '%water up to the first step%'
  );
