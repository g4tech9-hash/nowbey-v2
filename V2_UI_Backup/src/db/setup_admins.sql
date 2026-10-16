-- Promote existing owner accounts without changing their passwords, email addresses, or sessions.
-- Never put reusable passwords or password hashes in source control.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE handle = 'mario242') THEN
    RAISE EXCEPTION 'Account mario242 does not exist; create it through normal sign-up first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE handle = 'eastsiderick') THEN
    RAISE EXCEPTION 'Account eastsiderick does not exist; create it through normal sign-up first';
  END IF;
END $$;

UPDATE users
SET role = 'admin', status = 'active', suspended_reason = NULL, suspended_at = NULL
WHERE handle IN ('mario242', 'eastsiderick');

COMMIT;
