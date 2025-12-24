/*
  # Add Realm Support to Existing Tables
  
  This migration adds realm_id columns to all existing tables to support
  multi-tenant realm-based access.
  
  ## Changes
  1. Create realms table if not exists
  2. Add realm_id columns to all tables
  3. Add role column to profiles table
  4. Add indexes for performance
  
  ## Notes
  - All realm_id columns are nullable to support existing data
  - No policies are modified here (done in separate migration)
*/

-- Create realms table
CREATE TABLE IF NOT EXISTS realms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  display_name text,
  is_superadmin_realm boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add realm_id and role to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'realm_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN realm_id uuid REFERENCES realms(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role text DEFAULT 'user' CHECK (role IN ('superadmin', 'admin', 'user'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'state'
  ) THEN
    ALTER TABLE profiles ADD COLUMN state text DEFAULT 'approved' CHECK (state IN ('pending', 'approved', 'rejected', 'suspended'));
  END IF;
END $$;

-- Add realm_id to tasks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'realm_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN realm_id uuid REFERENCES realms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add realm_id to subtasks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subtasks' AND column_name = 'realm_id'
  ) THEN
    ALTER TABLE subtasks ADD COLUMN realm_id uuid REFERENCES realms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add realm_id to sub_subtasks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sub_subtasks' AND column_name = 'realm_id'
  ) THEN
    ALTER TABLE sub_subtasks ADD COLUMN realm_id uuid REFERENCES realms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add realm_id to milestones
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'milestones' AND column_name = 'realm_id'
  ) THEN
    ALTER TABLE milestones ADD COLUMN realm_id uuid REFERENCES realms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add realm_id to action_history
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'action_history' AND column_name = 'realm_id'
  ) THEN
    ALTER TABLE action_history ADD COLUMN realm_id uuid REFERENCES realms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add realm_id to app_config
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_config' AND column_name = 'realm_id'
  ) THEN
    ALTER TABLE app_config ADD COLUMN realm_id uuid REFERENCES realms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for realm_id columns
CREATE INDEX IF NOT EXISTS idx_profiles_realm_id ON profiles(realm_id);
CREATE INDEX IF NOT EXISTS idx_tasks_realm_id ON tasks(realm_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_realm_id ON subtasks(realm_id);
CREATE INDEX IF NOT EXISTS idx_sub_subtasks_realm_id ON sub_subtasks(realm_id);
CREATE INDEX IF NOT EXISTS idx_milestones_realm_id ON milestones(realm_id);
CREATE INDEX IF NOT EXISTS idx_action_history_realm_id ON action_history(realm_id);
CREATE INDEX IF NOT EXISTS idx_app_config_realm_id ON app_config(realm_id);
