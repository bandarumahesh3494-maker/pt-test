/*
  # Add Configuration Table

  1. New Tables
    - `app_config`
      - `id` (uuid, primary key)
      - `config_key` (text, unique) - Configuration key identifier
      - `config_value` (jsonb) - Configuration value as JSON
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `app_config` table
    - Add policy for anyone to read config (needed for app functionality)
    - Add policy for anyone to update config (simplified for demo purposes)

  3. Initial Data
    - Insert default milestone options
    - Insert default row colors
*/

CREATE TABLE IF NOT EXISTS app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  config_key text NOT NULL,
  config_value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT app_config_realm_config_unique UNIQUE (realm_id, config_key)
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_app_config_realm_id ON app_config(realm_id);
CREATE INDEX IF NOT EXISTS idx_app_config_config_key ON app_config(config_key);

CREATE POLICY "Users can view app_config for their realm"
  ON app_config FOR SELECT
  TO authenticated
  USING (realm_id = get_user_realm_id());

CREATE POLICY "Users can create app_config for their realm"
  ON app_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update app_config for their realm"
  ON app_config FOR UPDATE
  TO authenticated
  USING (realm_id = get_user_realm_id())
  WITH CHECK (realm_id = get_user_realm_id());

CREATE POLICY "Users can delete app_config for their realm"
  ON app_config FOR DELETE
  TO authenticated
  USING (realm_id = get_user_realm_id());

-- Auto-populate trigger
CREATE TRIGGER auto_populate_app_config_realm_user
  BEFORE INSERT ON app_config
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_realm_and_user();

GRANT SELECT, INSERT, UPDATE, DELETE ON app_config TO authenticated;

-- Note: Default config values are now per-realm and should be inserted by the application
-- when a realm first accesses Project Tracker.
--
-- Default milestone options:
-- [
--   {"value": "planned", "label": "PLANNED"},
--   {"value": "closed", "label": "CLOSED"},
--   {"value": "dev-complete", "label": "Dev Complete"},
--   {"value": "dev-merge-done", "label": "Dev Merge Done"},
--   {"value": "staging-merge-done", "label": "Staging Merge Done"},
--   {"value": "prod-merge-done", "label": "Prod Merge Done"},
--   {"value": "check", "label": "✓"}
-- ]
--
-- Default row colors:
-- {"planned": "#fbdd2b", "actual": "#1f3cd1"}
