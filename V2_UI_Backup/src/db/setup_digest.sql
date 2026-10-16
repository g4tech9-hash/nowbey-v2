-- Table for B2B Community Digest Partners
CREATE TABLE IF NOT EXISTS digest_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  parish text NOT NULL,
  categories text NOT NULL DEFAULT '',
  payment_status text NOT NULL DEFAULT 'unpaid', -- paid | unpaid
  plan_interval text NOT NULL DEFAULT 'month', -- month | year
  last_payment_at timestamptz,
  createdAt timestamptz DEFAULT now() NOT NULL,
  updatedAt timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_digest_partners_parish ON digest_partners(parish);
