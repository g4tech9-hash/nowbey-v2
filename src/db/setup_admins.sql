-- Admin accounts setup for NowBey
BEGIN;

INSERT INTO users (handle, display_name, email, parish, role, password_hash, ad_free_tier)
VALUES
  ('mario242', 'Mario', 'mario@nowbey.app', 'New Providence', 'admin', 'b74a1071c96bfe57f8e962c9:1d4581aa75431fc3ff358eda70c73ed3464b7beec557b8997569064a3b6a5df88bf7dfc076d2cb28', 'admiral'),
  ('eastsiderick', 'Eastside Rick', 'rick@nowbey.app', 'New Providence', 'admin', 'b74a1071c96bfe57f8e962c9:1d4581aa75431fc3ff358eda70c73ed3464b7beec557b8997569064a3b6a5df88bf7dfc076d2cb28', 'admiral')
ON CONFLICT (handle) DO UPDATE SET
  role = 'admin',
  password_hash = 'b74a1071c96bfe57f8e962c9:1d4581aa75431fc3ff358eda70c73ed3464b7beec557b8997569064a3b6a5df88bf7dfc076d2cb28',
  ad_free_tier = 'admiral';

COMMIT;
