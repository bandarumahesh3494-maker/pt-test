/*
  # Add Category Color Opacity Configuration

  1. Changes
    - Add opacity values for each task category color (dev, test, infra, support)
    - Opacity values range from 0.0 (transparent) to 1.0 (opaque)
    - Default opacity is 1.0 for all categories (fully opaque)

  2. Notes
    - This allows users to customize the opacity of category colors in the UI
    - Useful for visual hierarchy and readability
*/

INSERT INTO app_config (config_key, config_value)
VALUES (
  'category_opacity',
  '{
    "dev": 1.0,
    "test": 1.0,
    "infra": 1.0,
    "support": 1.0
  }'::jsonb
)
ON CONFLICT (config_key) DO NOTHING;
