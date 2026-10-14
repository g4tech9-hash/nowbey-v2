-- Ensure we are using the public schema
SET search_path TO public;

CREATE TABLE IF NOT EXISTS digest_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  parish text NOT NULL,
  categories text NOT NULL DEFAULT '',
  payment_status text NOT NULL DEFAULT 'unpaid', 
  plan_interval text NOT NULL DEFAULT 'month', 
  last_payment_at timestamptz,
  createdAt timestamptz DEFAULT now() NOT NULL,
  updatedAt timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_digest_partners_parish ON digest_partners(parish);

-- Test insert to verify it's working
INSERT INTO digest_partners (organisation, contact_name, email, parish)
VALUES ('Test HOA', 'Admin', 'test@example.com', 'New Providence')
ON CONFLICT DO NOTHING;
