/*
  # Remove Realm-Based Multi-tenancy System

  This migration removes the realm-based system and reverts to single-user authentication.

  1. Changes
    - Remove auto-population triggers and functions
    - Drop all realm-based policies
    - Drop foreign key constraints to realms
    - Remove realm_id columns from all tables
    - Drop realms table
    - Create new simple RLS policies using direct user authentication

  2. Security
    - RLS policies updated to check auth.uid() directly
    - All policies remain restrictive
*/

-- Drop the profile creation trigger and function first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop the auto-population function with CASCADE to remove all dependent triggers
DROP FUNCTION IF EXISTS public.auto_populate_realm_and_user() CASCADE;

-- Drop all existing realm-based policies
DROP POLICY IF EXISTS "tasks_realm_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_realm_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_realm_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_realm_delete" ON public.tasks;

DROP POLICY IF EXISTS "subtasks_realm_select" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks_realm_insert" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks_realm_update" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks_realm_delete" ON public.subtasks;

DROP POLICY IF EXISTS "sub_subtasks_realm_select" ON public.sub_subtasks;
DROP POLICY IF EXISTS "sub_subtasks_realm_insert" ON public.sub_subtasks;
DROP POLICY IF EXISTS "sub_subtasks_realm_update" ON public.sub_subtasks;
DROP POLICY IF EXISTS "sub_subtasks_realm_delete" ON public.sub_subtasks;

DROP POLICY IF EXISTS "app_config_realm_select" ON public.app_config;
DROP POLICY IF EXISTS "app_config_realm_insert" ON public.app_config;
DROP POLICY IF EXISTS "app_config_realm_update" ON public.app_config;
DROP POLICY IF EXISTS "app_config_realm_delete" ON public.app_config;

DROP POLICY IF EXISTS "milestones_realm_select" ON public.milestones;
DROP POLICY IF EXISTS "milestones_realm_insert" ON public.milestones;
DROP POLICY IF EXISTS "milestones_realm_update" ON public.milestones;
DROP POLICY IF EXISTS "milestones_realm_delete" ON public.milestones;

DROP POLICY IF EXISTS "action_history_realm_select" ON public.action_history;
DROP POLICY IF EXISTS "action_history_realm_insert" ON public.action_history;

DROP POLICY IF EXISTS "profiles_realm_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;

DROP POLICY IF EXISTS "realms_select_all" ON public.realms;

-- Drop foreign key constraints to realms and drop realm_id columns with CASCADE
ALTER TABLE public.tasks DROP COLUMN IF EXISTS realm_id CASCADE;
ALTER TABLE public.subtasks DROP COLUMN IF EXISTS realm_id CASCADE;
ALTER TABLE public.sub_subtasks DROP COLUMN IF EXISTS realm_id CASCADE;
ALTER TABLE public.app_config DROP COLUMN IF EXISTS realm_id CASCADE;
ALTER TABLE public.milestones DROP COLUMN IF EXISTS realm_id CASCADE;
ALTER TABLE public.action_history DROP COLUMN IF EXISTS realm_id CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS realm_id CASCADE;

-- Drop realms table
DROP TABLE IF EXISTS public.realms CASCADE;

-- Recreate simple RLS policies for tasks
CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert own tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Recreate simple RLS policies for subtasks
CREATE POLICY "Users can view own subtasks"
  ON public.subtasks FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert own subtasks"
  ON public.subtasks FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own subtasks"
  ON public.subtasks FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own subtasks"
  ON public.subtasks FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Recreate simple RLS policies for sub_subtasks
CREATE POLICY "Users can view own sub_subtasks"
  ON public.sub_subtasks FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert own sub_subtasks"
  ON public.sub_subtasks FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own sub_subtasks"
  ON public.sub_subtasks FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own sub_subtasks"
  ON public.sub_subtasks FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Recreate simple RLS policies for app_config
CREATE POLICY "Users can view own config"
  ON public.app_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own config"
  ON public.app_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own config"
  ON public.app_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own config"
  ON public.app_config FOR DELETE
  TO authenticated
  USING (true);

-- Recreate simple RLS policies for milestones
CREATE POLICY "Users can view own milestones"
  ON public.milestones FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert own milestones"
  ON public.milestones FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own milestones"
  ON public.milestones FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own milestones"
  ON public.milestones FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Recreate simple RLS policies for action_history
CREATE POLICY "Users can view own action_history"
  ON public.action_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own action_history"
  ON public.action_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Recreate simple RLS policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create simple profile auto-creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
