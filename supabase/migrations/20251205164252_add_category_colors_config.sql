/*
  # Add Category Colors Configuration

  1. Changes
    - Add category colors to app_config table for dev, test, infra, support
    - Each category can have a customizable hex color
    - Default colors match existing theme

  2. Notes
    - Category colors: dev (green), test (blue), infra (yellow), support (orange)
    - Colors are stored as hex values (e.g., #10b981)
*/

INSERT INTO app_config (config_key, config_value)
VALUES (
  'category_colors',
  '{
    "dev": "#10b981",
    "test": "#3b82f6",
    "infra": "#eab308",
    "support": "#f97316"
  }'::jsonb
)
ON CONFLICT (config_key) DO NOTHING;
