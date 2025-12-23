/*
============================================================================
CLEANUP AND RECREATE REALM-BASED POLICIES
============================================================================

## Summary
Removes all existing policies and recreates them with consistent realm-based
access control. Ensures all authenticated users in a realm can access that
realm's data without role restrictions.

## Changes
- Drops all existing policies on all project tracker tables
- Recreates policies with consistent naming and realm-based checks
- All users in a realm have full SELECT, INSERT, UPDATE, DELETE access
*/

-- ============================================================================
-- DROP ALL EXISTING POLICIES
-- ============================================================================

-- Tasks
DROP POLICY IF EXISTS "tasks_realm_select" ON tasks;
DROP POLICY IF EXISTS "tasks_realm_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_realm_update" ON tasks;
DROP POLICY IF EXISTS "tasks_realm_delete" ON tasks;
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

-- Subtasks
DROP POLICY IF EXISTS "subtasks_realm_select" ON subtasks;
DROP POLICY IF EXISTS "subtasks_realm_insert" ON subtasks;
DROP POLICY IF EXISTS "subtasks_realm_update" ON subtasks;
DROP POLICY IF EXISTS "subtasks_realm_delete" ON subtasks;
DROP POLICY IF EXISTS "subtasks_select" ON subtasks;
DROP POLICY IF EXISTS "subtasks_insert" ON subtasks;
DROP POLICY IF EXISTS "subtasks_update" ON subtasks;
DROP POLICY IF EXISTS "subtasks_delete" ON subtasks;

-- Sub-subtasks
DROP POLICY IF EXISTS "sub_subtasks_realm_select" ON sub_subtasks;
DROP POLICY IF EXISTS "sub_subtasks_realm_insert" ON sub_subtasks;
DROP POLICY IF EXISTS "sub_subtasks_realm_update" ON sub_subtasks;
DROP POLICY IF EXISTS "sub_subtasks_realm_delete" ON sub_subtasks;
DROP POLICY IF EXISTS "sub_subtasks_select" ON sub_subtasks;
DROP POLICY IF EXISTS "sub_subtasks_insert" ON sub_subtasks;
DROP POLICY IF EXISTS "sub_subtasks_update" ON sub_subtasks;
DROP POLICY IF EXISTS "sub_subtasks_delete" ON sub_subtasks;

-- Milestones
DROP POLICY IF EXISTS "milestones_realm_select" ON milestones;
DROP POLICY IF EXISTS "milestones_realm_insert" ON milestones;
DROP POLICY IF EXISTS "milestones_realm_update" ON milestones;
DROP POLICY IF EXISTS "milestones_realm_delete" ON milestones;
DROP POLICY IF EXISTS "milestones_select" ON milestones;
DROP POLICY IF EXISTS "milestones_insert" ON milestones;
DROP POLICY IF EXISTS "milestones_update" ON milestones;
DROP POLICY IF EXISTS "milestones_delete" ON milestones;

-- App Config
DROP POLICY IF EXISTS "app_config_realm_select" ON app_config;
DROP POLICY IF EXISTS "app_config_realm_insert" ON app_config;
DROP POLICY IF EXISTS "app_config_realm_update" ON app_config;
DROP POLICY IF EXISTS "app_config_realm_delete" ON app_config;
DROP POLICY IF EXISTS "Users can view app_config for their realm" ON app_config;
DROP POLICY IF EXISTS "Users can create app_config for their realm" ON app_config;
DROP POLICY IF EXISTS "Users can update app_config for their realm" ON app_config;
DROP POLICY IF EXISTS "Users can delete app_config for their realm" ON app_config;

-- Action History
DROP POLICY IF EXISTS "action_history_realm_select" ON action_history;
DROP POLICY IF EXISTS "action_history_realm_insert" ON action_history;
DROP POLICY IF EXISTS "Users can view action_history in their realm" ON action_history;
DROP POLICY IF EXISTS "Users can create action_history in their realm" ON action_history;

-- ============================================================================
-- RECREATE REALM-BASED POLICIES
-- ============================================================================

-- TASKS
CREATE POLICY "tasks_realm_select"
  ON tasks FOR SELECT
  TO authenticated
  USING (realm_id = get_user_realm_id());

CREATE POLICY "tasks_realm_insert"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "tasks_realm_update"
  ON tasks FOR UPDATE
  TO authenticated
  USING (realm_id = get_user_realm_id())
  WITH CHECK (realm_id = get_user_realm_id());

CREATE POLICY "tasks_realm_delete"
  ON tasks FOR DELETE
  TO authenticated
  USING (realm_id = get_user_realm_id());

-- SUBTASKS
CREATE POLICY "subtasks_realm_select"
  ON subtasks FOR SELECT
  TO authenticated
  USING (realm_id = get_user_realm_id());

CREATE POLICY "subtasks_realm_insert"
  ON subtasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "subtasks_realm_update"
  ON subtasks FOR UPDATE
  TO authenticated
  USING (realm_id = get_user_realm_id())
  WITH CHECK (realm_id = get_user_realm_id());

CREATE POLICY "subtasks_realm_delete"
  ON subtasks FOR DELETE
  TO authenticated
  USING (realm_id = get_user_realm_id());

-- SUB-SUBTASKS
CREATE POLICY "sub_subtasks_realm_select"
  ON sub_subtasks FOR SELECT
  TO authenticated
  USING (realm_id = get_user_realm_id());

CREATE POLICY "sub_subtasks_realm_insert"
  ON sub_subtasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "sub_subtasks_realm_update"
  ON sub_subtasks FOR UPDATE
  TO authenticated
  USING (realm_id = get_user_realm_id())
  WITH CHECK (realm_id = get_user_realm_id());

CREATE POLICY "sub_subtasks_realm_delete"
  ON sub_subtasks FOR DELETE
  TO authenticated
  USING (realm_id = get_user_realm_id());

-- MILESTONES
CREATE POLICY "milestones_realm_select"
  ON milestones FOR SELECT
  TO authenticated
  USING (realm_id = get_user_realm_id());

CREATE POLICY "milestones_realm_insert"
  ON milestones FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "milestones_realm_update"
  ON milestones FOR UPDATE
  TO authenticated
  USING (realm_id = get_user_realm_id())
  WITH CHECK (realm_id = get_user_realm_id());

CREATE POLICY "milestones_realm_delete"
  ON milestones FOR DELETE
  TO authenticated
  USING (realm_id = get_user_realm_id());

-- APP CONFIG
CREATE POLICY "app_config_realm_select"
  ON app_config FOR SELECT
  TO authenticated
  USING (realm_id = get_user_realm_id());

CREATE POLICY "app_config_realm_insert"
  ON app_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "app_config_realm_update"
  ON app_config FOR UPDATE
  TO authenticated
  USING (realm_id = get_user_realm_id())
  WITH CHECK (realm_id = get_user_realm_id());

CREATE POLICY "app_config_realm_delete"
  ON app_config FOR DELETE
  TO authenticated
  USING (realm_id = get_user_realm_id());

-- ACTION HISTORY
CREATE POLICY "action_history_realm_select"
  ON action_history FOR SELECT
  TO authenticated
  USING (realm_id = get_user_realm_id());

CREATE POLICY "action_history_realm_insert"
  ON action_history FOR INSERT
  TO authenticated
  WITH CHECK (true);
