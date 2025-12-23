/*
  # Add Opacity Configuration to Row Colors

  1. Changes
    - Update the row_colors config to include opacity values for planned, actual, and sub-subtask rows
    - Add default opacity values: plannedOpacity (0.2), actualOpacity (0.2), subSubtaskOpacity (0.15)

  2. Notes
    - This migration updates the existing row_colors configuration
    - If the row_colors config doesn't exist, it creates it with default values
*/

DO $$
DECLARE
  existing_config jsonb;
BEGIN
  -- Get existing config
  SELECT config_value INTO existing_config
  FROM app_config
  WHERE config_key = 'row_colors';

  -- If config exists, update it with opacity values
  IF existing_config IS NOT NULL THEN
    UPDATE app_config
    SET config_value = existing_config || 
      jsonb_build_object(
        'plannedOpacity', 0.2,
        'actualOpacity', 0.2,
        'subSubtaskOpacity', 0.15
      ),
      updated_at = now()
    WHERE config_key = 'row_colors';
  ELSE
    -- If config doesn't exist, create it with defaults
    INSERT INTO app_config (config_key, config_value)
    VALUES (
      'row_colors',
      jsonb_build_object(
        'planned', '#fbdd2b',
        'actual', '#1f3cd1',
        'plannedOpacity', 0.2,
        'actualOpacity', 0.2,
        'subSubtaskOpacity', 0.15
      )
    );
  END IF;
END $$;
