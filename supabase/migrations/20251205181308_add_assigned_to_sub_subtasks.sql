/*
  # Add assigned_to column to sub_subtasks

  1. Changes
    - Add `assigned_to` column to `sub_subtasks` table
      - References `users.id` for engineer/lead assignment
      - Nullable to allow unassigned sub-subtasks
    
  2. Security
    - No RLS changes needed (inherits from existing table policies)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sub_subtasks' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE sub_subtasks ADD COLUMN assigned_to uuid REFERENCES users(id);
  END IF;
END $$;
