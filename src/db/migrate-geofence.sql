-- Geofenced alerts: centre point per subscription. Safe to run twice.
ALTER TABLE alert_subscriptions ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE alert_subscriptions ADD COLUMN IF NOT EXISTS lng double precision;
-- radius_km already exists on older installs; keep the default sane.
-- ALTER TABLE alert_subscriptions ADD COLUMN IF NOT EXISTS radius_km integer NOT NULL DEFAULT 12;
