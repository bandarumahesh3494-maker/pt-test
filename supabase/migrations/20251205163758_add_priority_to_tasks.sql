/*
  # Add Priority Field to Tasks

  1. Changes
    - Add priority column to tasks table (1 = low, 2 = medium, 3 = high)
    - Default priority is 2 (medium)

  2. Notes
    - Priority values: 1 (low/1 star), 2 (medium/2 stars), 3 (high/3 stars)
    - Using integers for easy sorting and filtering
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'priority'
  ) THEN
    ALTER TABLE tasks ADD COLUMN priority INTEGER DEFAULT 2 CHECK (priority >= 1 AND priority <= 3);
  END IF;
END $$;
