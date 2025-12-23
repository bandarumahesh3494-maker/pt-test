/*
  # Add Sub-Subtasks Support

  1. New Tables
    - `sub_subtasks`
      - `id` (uuid, primary key) - Unique identifier for the sub-subtask
      - `subtask_id` (uuid, foreign key) - References the parent subtask
      - `name` (text) - Name of the sub-subtask
      - `order_index` (integer) - Order of the sub-subtask within the subtask
      - `created_at` (timestamptz) - Creation timestamp
      - `created_by` (uuid) - User who created the sub-subtask

  2. Security
    - Enable RLS on `sub_subtasks` table
    - Add policy for all users to read sub-subtasks
    - Add policy for all users to insert sub-subtasks
    - Add policy for all users to update sub-subtasks
    - Add policy for all users to delete sub-subtasks

  3. Changes
    - Update milestones table to reference sub_subtasks as well
    - Add nullable `sub_subtask_id` column to milestones
*/

-- Create sub_subtasks table
CREATE TABLE IF NOT EXISTS sub_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  subtask_id uuid NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sub_subtasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sub_subtasks_realm_id ON sub_subtasks(realm_id);
CREATE INDEX IF NOT EXISTS idx_sub_subtasks_user_id ON sub_subtasks(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_subtasks_subtask_id ON sub_subtasks(subtask_id);
CREATE INDEX IF NOT EXISTS idx_sub_subtasks_assigned_to ON sub_subtasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sub_subtasks_created_by ON sub_subtasks(created_by);

-- Create policies for sub_subtasks
CREATE POLICY "Users can view sub_subtasks in their realm"
  ON sub_subtasks FOR SELECT
  TO authenticated
  USING (realm_id = get_user_realm_id());

CREATE POLICY "Users can create sub_subtasks in their realm"
  ON sub_subtasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update sub_subtasks in their realm"
  ON sub_subtasks FOR UPDATE
  TO authenticated
  USING (realm_id = get_user_realm_id())
  WITH CHECK (realm_id = get_user_realm_id());

CREATE POLICY "Users can delete sub_subtasks in their realm"
  ON sub_subtasks FOR DELETE
  TO authenticated
  USING (realm_id = get_user_realm_id());

-- Auto-populate trigger
CREATE TRIGGER auto_populate_sub_subtasks_realm_user
  BEFORE INSERT ON sub_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_realm_and_user();

GRANT SELECT, INSERT, UPDATE, DELETE ON sub_subtasks TO authenticated;

-- Add sub_subtask_id to milestones table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'milestones' AND column_name = 'sub_subtask_id'
  ) THEN
    ALTER TABLE milestones ADD COLUMN sub_subtask_id uuid REFERENCES sub_subtasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add check constraint to ensure milestone is linked to either subtask or sub_subtask
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'milestone_link_check'
  ) THEN
    ALTER TABLE milestones ADD CONSTRAINT milestone_link_check
      CHECK (
        (subtask_id IS NOT NULL AND sub_subtask_id IS NULL) OR
        (subtask_id IS NULL AND sub_subtask_id IS NOT NULL)
      );
  END IF;
END $$;