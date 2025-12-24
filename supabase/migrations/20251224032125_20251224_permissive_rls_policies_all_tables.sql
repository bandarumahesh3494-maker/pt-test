/*
  # Permissive RLS Policies for All Tables
  
  This migration creates permissive RLS policies that allow all authenticated users
  to access all data regardless of realm_id or user_id.
  
  ## Security Model
  - All authenticated users can read all data
  - All authenticated users can insert/update/delete all data
  - Realm and user IDs are tracked but not enforced by policies
  - Application-level logic can filter by realm if needed
  
  ## Tables Covered
  1. profiles
  2. realms
  3. tasks
  4. subtasks
  5. sub_subtasks
  6. milestones
  7. action_history
  8. app_config
*/

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE realms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all authenticated users full access" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

DROP POLICY IF EXISTS "Allow all authenticated users full access" ON realms;
DROP POLICY IF EXISTS "realms_select_policy" ON realms;
DROP POLICY IF EXISTS "realms_insert_policy" ON realms;
DROP POLICY IF EXISTS "realms_update_policy" ON realms;
DROP POLICY IF EXISTS "realms_delete_policy" ON realms;

DROP POLICY IF EXISTS "Allow all authenticated users full access" ON tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;

DROP POLICY IF EXISTS "Allow all authenticated users full access" ON subtasks;
DROP POLICY IF EXISTS "subtasks_select_policy" ON subtasks;
DROP POLICY IF EXISTS "subtasks_insert_policy" ON subtasks;
DROP POLICY IF EXISTS "subtasks_update_policy" ON subtasks;
DROP POLICY IF EXISTS "subtasks_delete_policy" ON subtasks;

DROP POLICY IF EXISTS "Allow all authenticated users full access" ON sub_subtasks;
DROP POLICY IF EXISTS "sub_subtasks_select_policy" ON sub_subtasks;
DROP POLICY IF EXISTS "sub_subtasks_insert_policy" ON sub_subtasks;
DROP POLICY IF EXISTS "sub_subtasks_update_policy" ON sub_subtasks;
DROP POLICY IF EXISTS "sub_subtasks_delete_policy" ON sub_subtasks;

DROP POLICY IF EXISTS "Allow all authenticated users full access" ON milestones;
DROP POLICY IF EXISTS "milestones_select_policy" ON milestones;
DROP POLICY IF EXISTS "milestones_insert_policy" ON milestones;
DROP POLICY IF EXISTS "milestones_update_policy" ON milestones;
DROP POLICY IF EXISTS "milestones_delete_policy" ON milestones;

DROP POLICY IF EXISTS "Allow all authenticated users full access" ON action_history;
DROP POLICY IF EXISTS "action_history_select_policy" ON action_history;
DROP POLICY IF EXISTS "action_history_insert_policy" ON action_history;
DROP POLICY IF EXISTS "action_history_update_policy" ON action_history;
DROP POLICY IF EXISTS "action_history_delete_policy" ON action_history;

DROP POLICY IF EXISTS "Allow all authenticated users full access" ON app_config;
DROP POLICY IF EXISTS "app_config_select_policy" ON app_config;
DROP POLICY IF EXISTS "app_config_insert_policy" ON app_config;
DROP POLICY IF EXISTS "app_config_update_policy" ON app_config;
DROP POLICY IF EXISTS "app_config_delete_policy" ON app_config;

-- Create permissive policies for PROFILES
CREATE POLICY "Allow authenticated users to read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (true);

-- Create permissive policies for REALMS
CREATE POLICY "Allow authenticated users to read all realms"
  ON realms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert realms"
  ON realms FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update all realms"
  ON realms FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete realms"
  ON realms FOR DELETE
  TO authenticated
  USING (true);

-- Create permissive policies for TASKS
CREATE POLICY "Allow authenticated users to read all tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update all tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (true);

-- Create permissive policies for SUBTASKS
CREATE POLICY "Allow authenticated users to read all subtasks"
  ON subtasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert subtasks"
  ON subtasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update all subtasks"
  ON subtasks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete subtasks"
  ON subtasks FOR DELETE
  TO authenticated
  USING (true);

-- Create permissive policies for SUB_SUBTASKS
CREATE POLICY "Allow authenticated users to read all sub_subtasks"
  ON sub_subtasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert sub_subtasks"
  ON sub_subtasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update all sub_subtasks"
  ON sub_subtasks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete sub_subtasks"
  ON sub_subtasks FOR DELETE
  TO authenticated
  USING (true);

-- Create permissive policies for MILESTONES
CREATE POLICY "Allow authenticated users to read all milestones"
  ON milestones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert milestones"
  ON milestones FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update all milestones"
  ON milestones FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete milestones"
  ON milestones FOR DELETE
  TO authenticated
  USING (true);

-- Create permissive policies for ACTION_HISTORY
CREATE POLICY "Allow authenticated users to read all action_history"
  ON action_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert action_history"
  ON action_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update all action_history"
  ON action_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete action_history"
  ON action_history FOR DELETE
  TO authenticated
  USING (true);

-- Create permissive policies for APP_CONFIG
CREATE POLICY "Allow authenticated users to read all app_config"
  ON app_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert app_config"
  ON app_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update all app_config"
  ON app_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete app_config"
  ON app_config FOR DELETE
  TO authenticated
  USING (true);
