-- AI usage ledger + daily cost cap (the "cost kill"). Safe to re-run.
-- Powers AI_DAILY_CALL_LIMIT enforcement and the Admin overview's AI spend line.
-- Without this table the cap still works per server instance (in-memory fallback);
-- with it, the cap and the counts are shared across every instance.
CREATE TABLE IF NOT EXISTS ai_usage_daily (
  day text PRIMARY KEY,
  calls integer NOT NULL DEFAULT 0,
  prompt_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
