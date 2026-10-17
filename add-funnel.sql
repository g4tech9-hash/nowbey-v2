-- Daily adoption funnel counts (see src/lib/funnel.ts). Safe to run twice.
CREATE TABLE IF NOT EXISTS funnel_daily (
  day date NOT NULL,
  step text NOT NULL,
  n integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, step)
);
