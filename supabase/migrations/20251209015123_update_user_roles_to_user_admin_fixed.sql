/*
  # Update User Roles from Engineer/Lead to User/Admin

  1. Changes
    - Update the `role` column in `users` table to use 'user' and 'admin' instead of 'engineer' and 'lead'
    - Update existing data to reflect new role names
    - Update all RLS policies to use new role names
    - Add user entity type to action_history for tracking user additions/removals

  2. Security
    - Maintain all existing RLS policies with updated role names
    - Admins (previously leads) retain full access
    - Users (previously engineers) retain their restricted access
*/

-- Drop existing constraint first
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Update existing data from 'engineer' to 'user' and 'lead' to 'admin'
UPDATE users SET role = 'user' WHERE role = 'engineer';
UPDATE users SET role = 'admin' WHERE role = 'lead';

-- Add new constraint with updated values
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));

-- Drop and recreate policies with updated role names

-- Tasks policies
DROP POLICY IF EXISTS "Users can update tasks based on role" ON tasks;
CREATE POLICY "Users can update tasks based on role"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR tasks.created_by = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR tasks.created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Leads can delete tasks" ON tasks;
CREATE POLICY "Admins can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Subtasks policies
DROP POLICY IF EXISTS "Users can update subtasks based on role" ON subtasks;
CREATE POLICY "Users can update subtasks based on role"
  ON subtasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR subtasks.assigned_to = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR subtasks.assigned_to = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Leads can delete subtasks" ON subtasks;
CREATE POLICY "Admins can delete subtasks"
  ON subtasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Milestones policies
DROP POLICY IF EXISTS "Users can update milestones based on role" ON milestones;
CREATE POLICY "Users can update milestones based on role"
  ON milestones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        users.role = 'admin' 
        OR EXISTS (
          SELECT 1 FROM subtasks
          WHERE subtasks.id = milestones.subtask_id
          AND subtasks.assigned_to = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        users.role = 'admin' 
        OR EXISTS (
          SELECT 1 FROM subtasks
          WHERE subtasks.id = milestones.subtask_id
          AND subtasks.assigned_to = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Leads can delete milestones" ON milestones;
CREATE POLICY "Admins can delete milestones"
  ON milestones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Update action_history constraint to include user entity type
ALTER TABLE action_history DROP CONSTRAINT IF EXISTS action_history_entity_type_check;
ALTER TABLE action_history ADD CONSTRAINT action_history_entity_type_check 
  CHECK (entity_type IN ('task', 'subtask', 'sub_subtask', 'milestone', 'user'));
