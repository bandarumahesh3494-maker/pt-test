/*
============================================================================
PROJECT TRACKER – REALM-BASED MULTI-TENANT SYSTEM
============================================================================

## Summary
Complete realm-based project tracking system where all users can access data
within their assigned realm. No role-based restrictions - all authenticated
users in a realm have full access to that realm's data.

## Tables Created

### 1. Realms
- Core multi-tenant isolation unit
- Each realm represents a separate workspace/organization

### 2. Profiles  
- User profiles linked to realms
- Each user belongs to one realm

### 3. Tasks
- Top-level work items
- Categorized as: dev, test, infra, support
- Priority levels: 1 (highest) to 3 (lowest)

### 4. Subtasks
- Child items of tasks
- Can be assigned to specific users

### 5. Sub-Subtasks
- Granular work items under subtasks
- Can be assigned to specific users
- Ordered by order_index

### 6. Milestones
- Date-based checkpoints for subtasks or sub-subtasks
- Must be attached to either subtask OR sub-subtask (not both)

### 7. App Config
- Realm-specific configuration storage
- JSON-based flexible config system

### 8. Action History
- Audit trail of all changes
- Tracks create/update/delete operations

## Security Model
- ALL policies check: `realm_id = get_user_realm_id()`
- Users can ONLY access data in their own realm
- All authenticated users in a realm have equal access (no roles)
- Triggers auto-populate realm_id and user_id on INSERT

## Helper Functions
- `get_user_realm_id()`: Returns current user's realm from profile
- `auto_populate_realm_and_user()`: Trigger function to set realm/user fields
*/

-- ============================================================================
-- REALMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS realms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE realms ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view all realms (for realm selection/switching)
CREATE POLICY "realms_select_all"
  ON realms FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON realms TO authenticated;

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  realm_id uuid REFERENCES realms(id) ON DELETE SET NULL,
  email text,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_profiles_realm_id ON profiles(realm_id);

-- Users can view profiles in their realm
CREATE POLICY "profiles_realm_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (realm_id = (
    SELECT realm_id FROM profiles WHERE id = auth.uid()
  ));

-- Users can update their own profile
CREATE POLICY "profiles_self_update"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

GRANT SELECT, UPDATE ON profiles TO authenticated;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_realm_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT realm_id
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_user_realm_id() TO authenticated;

CREATE OR REPLACE FUNCTION auto_populate_realm_and_user()
RETURNS TRIGGER AS $$
DECLARE
  current_realm uuid;
BEGIN
  SELECT realm_id INTO current_realm
  FROM profiles
  WHERE id = auth.uid();

  IF current_realm IS NULL THEN
    RAISE EXCEPTION 'User does not have a realm assigned';
  END IF;

  NEW.realm_id := current_realm;
  
  IF TG_TABLE_NAME != 'action_history' THEN
    NEW.user_id := auth.uid();
  END IF;
  
  IF TG_TABLE_NAME IN ('tasks', 'subtasks', 'milestones') THEN
    NEW.created_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TASKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('dev', 'test', 'infra', 'support')),
  priority int DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tasks_realm_id ON tasks(realm_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);

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

CREATE TRIGGER trg_tasks_realm
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_realm_and_user();

GRANT ALL ON tasks TO authenticated;

-- ============================================================================
-- SUBTASKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name text NOT NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_subtasks_realm_id ON subtasks(realm_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_to ON subtasks(assigned_to);

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

CREATE TRIGGER trg_subtasks_realm
  BEFORE INSERT ON subtasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_realm_and_user();

GRANT ALL ON subtasks TO authenticated;

-- ============================================================================
-- SUB-SUBTASKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sub_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  subtask_id uuid NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index int DEFAULT 0,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sub_subtasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sub_subtasks_realm_id ON sub_subtasks(realm_id);
CREATE INDEX IF NOT EXISTS idx_sub_subtasks_subtask_id ON sub_subtasks(subtask_id);
CREATE INDEX IF NOT EXISTS idx_sub_subtasks_assigned_to ON sub_subtasks(assigned_to);

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

CREATE TRIGGER trg_sub_subtasks_realm
  BEFORE INSERT ON sub_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_realm_and_user();

GRANT ALL ON sub_subtasks TO authenticated;

-- ============================================================================
-- MILESTONES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  subtask_id uuid REFERENCES subtasks(id) ON DELETE CASCADE,
  sub_subtask_id uuid REFERENCES sub_subtasks(id) ON DELETE CASCADE,
  milestone_date date NOT NULL,
  milestone_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (
    (subtask_id IS NOT NULL AND sub_subtask_id IS NULL)
    OR
    (subtask_id IS NULL AND sub_subtask_id IS NOT NULL)
  )
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_milestones_realm_id ON milestones(realm_id);
CREATE INDEX IF NOT EXISTS idx_milestones_subtask_id ON milestones(subtask_id);
CREATE INDEX IF NOT EXISTS idx_milestones_sub_subtask_id ON milestones(sub_subtask_id);
CREATE INDEX IF NOT EXISTS idx_milestones_date ON milestones(milestone_date);

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

CREATE TRIGGER trg_milestones_realm
  BEFORE INSERT ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_realm_and_user();

GRANT ALL ON milestones TO authenticated;

-- ============================================================================
-- APP CONFIG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  config_key text NOT NULL,
  config_value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT app_config_realm_key_unique UNIQUE (realm_id, config_key)
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_app_config_realm_id ON app_config(realm_id);
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(config_key);

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

CREATE TRIGGER trg_app_config_realm
  BEFORE INSERT ON app_config
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_realm_and_user();

GRANT ALL ON app_config TO authenticated;

-- ============================================================================
-- ACTION HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS action_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('create', 'update', 'delete')),
  entity_type text NOT NULL CHECK (entity_type IN ('task', 'subtask', 'sub_subtask', 'milestone', 'user')),
  entity_id uuid NOT NULL,
  entity_name text NOT NULL,
  details jsonb DEFAULT '{}',
  performed_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE action_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_action_history_realm_id ON action_history(realm_id);
CREATE INDEX IF NOT EXISTS idx_action_history_user_id ON action_history(user_id);
CREATE INDEX IF NOT EXISTS idx_action_history_entity ON action_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_action_history_created_at ON action_history(created_at DESC);

CREATE POLICY "action_history_realm_select"
  ON action_history FOR SELECT
  TO authenticated
  USING (realm_id = get_user_realm_id());

CREATE POLICY "action_history_realm_insert"
  ON action_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TRIGGER trg_action_history_realm
  BEFORE INSERT ON action_history
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_realm_and_user();

GRANT SELECT, INSERT ON action_history TO authenticated;
