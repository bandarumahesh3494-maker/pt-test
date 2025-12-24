/*
  # Complete Project Tracker Database Schema

  ## Overview
  This migration creates the complete database schema for a multi-tenant project tracking application.
  All users are automatically authenticated and assigned to a default realm.

  ## Tables Created

  1. **realms** - Multi-tenant organizations
  2. **profiles** - User profiles (extends auth.users)
  3. **tasks** - Top-level work items
  4. **subtasks** - Tasks broken into smaller pieces
  5. **sub_subtasks** - Further breakdown of subtasks
  6. **milestones** - Date-based checkpoints
  7. **action_history** - Audit log of all changes
  8. **app_config** - Application settings per realm

  ## Security Model
  - All tables have RLS enabled
  - Permissive policies: all authenticated users can access all data
  - realm_id is tracked but not enforced at database level

  ## Automatic Behaviors
  1. New users auto-create profile in default realm
  2. Auto-populate realm_id from user's profile
  3. Auto-update timestamps on changes
*/

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS realms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  display_name text,
  is_superadmin_realm boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  realm_id uuid REFERENCES realms(id) ON DELETE SET NULL,
  role text DEFAULT 'user' CHECK (role IN ('superadmin', 'admin', 'user')),
  is_active boolean DEFAULT true,
  state text DEFAULT 'approved' CHECK (state IN ('pending', 'approved', 'rejected', 'suspended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid REFERENCES realms(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('dev','test','infra','support')),
  priority int DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid REFERENCES realms(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name text NOT NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sub_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid REFERENCES realms(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  subtask_id uuid NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid REFERENCES realms(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  subtask_id uuid REFERENCES subtasks(id) ON DELETE CASCADE,
  sub_subtask_id uuid REFERENCES sub_subtasks(id) ON DELETE CASCADE,
  milestone_date date NOT NULL,
  milestone_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT milestone_link_check CHECK (
    (subtask_id IS NOT NULL AND sub_subtask_id IS NULL) OR
    (subtask_id IS NULL AND sub_subtask_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS action_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid REFERENCES realms(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('create', 'update', 'delete')),
  entity_type text NOT NULL CHECK (entity_type IN ('task', 'subtask', 'sub_subtask', 'milestone')),
  entity_id uuid NOT NULL,
  entity_name text NOT NULL,
  details jsonb DEFAULT '{}',
  performed_by text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid REFERENCES realms(id) ON DELETE SET NULL,
  config_key text NOT NULL,
  config_value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT app_config_realm_config_unique UNIQUE (realm_id, config_key)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_realm_id ON profiles(realm_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_tasks_realm_id ON tasks(realm_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_subtasks_realm_id ON subtasks(realm_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_to ON subtasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sub_subtasks_realm_id ON sub_subtasks(realm_id);
CREATE INDEX IF NOT EXISTS idx_sub_subtasks_subtask_id ON sub_subtasks(subtask_id);
CREATE INDEX IF NOT EXISTS idx_sub_subtasks_assigned_to ON sub_subtasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_milestones_realm_id ON milestones(realm_id);
CREATE INDEX IF NOT EXISTS idx_milestones_subtask_id ON milestones(subtask_id);
CREATE INDEX IF NOT EXISTS idx_milestones_sub_subtask_id ON milestones(sub_subtask_id);
CREATE INDEX IF NOT EXISTS idx_milestones_date ON milestones(milestone_date);
CREATE INDEX IF NOT EXISTS idx_action_history_realm_id ON action_history(realm_id);
CREATE INDEX IF NOT EXISTS idx_action_history_entity ON action_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_action_history_created_at ON action_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_config_realm_id ON app_config(realm_id);
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(config_key);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_realm_id uuid;
BEGIN
  SELECT id INTO default_realm_id FROM realms WHERE slug = 'default' LIMIT 1;
  INSERT INTO public.profiles (id, email, full_name, realm_id, role, is_active, state)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), default_realm_id, 'user', true, 'approved');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_set_realm_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.realm_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT realm_id INTO NEW.realm_id FROM profiles WHERE id = auth.uid();
  END IF;
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_realms_updated_at ON realms;
CREATE TRIGGER update_realms_updated_at BEFORE UPDATE ON realms FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_subtasks_updated_at ON subtasks;
CREATE TRIGGER update_subtasks_updated_at BEFORE UPDATE ON subtasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_sub_subtasks_updated_at ON sub_subtasks;
CREATE TRIGGER update_sub_subtasks_updated_at BEFORE UPDATE ON sub_subtasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_milestones_updated_at ON milestones;
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_app_config_updated_at ON app_config;
CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS auto_set_realm_id_tasks ON tasks;
CREATE TRIGGER auto_set_realm_id_tasks BEFORE INSERT ON tasks FOR EACH ROW EXECUTE FUNCTION auto_set_realm_id();

DROP TRIGGER IF EXISTS auto_set_realm_id_subtasks ON subtasks;
CREATE TRIGGER auto_set_realm_id_subtasks BEFORE INSERT ON subtasks FOR EACH ROW EXECUTE FUNCTION auto_set_realm_id();

DROP TRIGGER IF EXISTS auto_set_realm_id_sub_subtasks ON sub_subtasks;
CREATE TRIGGER auto_set_realm_id_sub_subtasks BEFORE INSERT ON sub_subtasks FOR EACH ROW EXECUTE FUNCTION auto_set_realm_id();

DROP TRIGGER IF EXISTS auto_set_realm_id_milestones ON milestones;
CREATE TRIGGER auto_set_realm_id_milestones BEFORE INSERT ON milestones FOR EACH ROW EXECUTE FUNCTION auto_set_realm_id();

DROP TRIGGER IF EXISTS auto_set_realm_id_action_history ON action_history;
CREATE TRIGGER auto_set_realm_id_action_history BEFORE INSERT ON action_history FOR EACH ROW EXECUTE FUNCTION auto_set_realm_id();

DROP TRIGGER IF EXISTS auto_set_realm_id_app_config ON app_config;
CREATE TRIGGER auto_set_realm_id_app_config BEFORE INSERT ON app_config FOR EACH ROW EXECUTE FUNCTION auto_set_realm_id();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE realms ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read all realms" ON realms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert realms" ON realms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update all realms" ON realms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete realms" ON realms FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert profiles" ON profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update all profiles" ON profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete profiles" ON profiles FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read all tasks" ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update all tasks" ON tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete tasks" ON tasks FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read all subtasks" ON subtasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert subtasks" ON subtasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update all subtasks" ON subtasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete subtasks" ON subtasks FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read all sub_subtasks" ON sub_subtasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert sub_subtasks" ON sub_subtasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update all sub_subtasks" ON sub_subtasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete sub_subtasks" ON sub_subtasks FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read all milestones" ON milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert milestones" ON milestones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update all milestones" ON milestones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete milestones" ON milestones FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read all action_history" ON action_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert action_history" ON action_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update all action_history" ON action_history FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete action_history" ON action_history FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read all app_config" ON app_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert app_config" ON app_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update all app_config" ON app_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete app_config" ON app_config FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON realms TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON subtasks TO authenticated;
GRANT ALL ON sub_subtasks TO authenticated;
GRANT ALL ON milestones TO authenticated;
GRANT ALL ON action_history TO authenticated;
GRANT ALL ON app_config TO authenticated;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

INSERT INTO realms (name, slug, display_name, is_superadmin_realm)
VALUES ('Default Realm', 'default', 'Default Organization', false)
ON CONFLICT (slug) DO NOTHING;
