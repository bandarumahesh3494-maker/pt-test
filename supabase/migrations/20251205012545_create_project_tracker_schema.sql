/* ============================================================================
   PROJECT TRACKER – REALM BASED (profiles.realm_id)
   ============================================================================ */

-- ---------------------------------------------------------------------------
-- Helper: current user's realm
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Trigger: auto populate realm + user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_populate_realm_and_user()
RETURNS TRIGGER AS $$
DECLARE
  current_realm uuid;
BEGIN
  current_realm := get_user_realm_id();

  IF current_realm IS NULL THEN
    RAISE EXCEPTION 'User does not belong to any realm';
  END IF;

  NEW.realm_id := current_realm;
  NEW.user_id := auth.uid();
  NEW.created_by := auth.uid();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================================================
-- TASKS
-- ===========================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('dev','test','infra','support')),
  priority int DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select
  ON tasks FOR SELECT
  USING (realm_id = get_user_realm_id());

CREATE POLICY tasks_insert
  ON tasks FOR INSERT
  WITH CHECK (realm_id = get_user_realm_id());

CREATE POLICY tasks_update
  ON tasks FOR UPDATE
  USING (realm_id = get_user_realm_id());

CREATE POLICY tasks_delete
  ON tasks FOR DELETE
  USING (realm_id = get_user_realm_id());

CREATE TRIGGER trg_tasks_realm
BEFORE INSERT ON tasks
FOR EACH ROW
EXECUTE FUNCTION auto_populate_realm_and_user();

GRANT ALL ON tasks TO authenticated;

-- ===========================================================================
-- SUBTASKS
-- ===========================================================================
CREATE TABLE IF NOT EXISTS subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  name text NOT NULL,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY subtasks_select
  ON subtasks FOR SELECT
  USING (realm_id = get_user_realm_id());

CREATE POLICY subtasks_insert
  ON subtasks FOR INSERT
  WITH CHECK (realm_id = get_user_realm_id());

CREATE POLICY subtasks_update
  ON subtasks FOR UPDATE
  USING (realm_id = get_user_realm_id());

CREATE POLICY subtasks_delete
  ON subtasks FOR DELETE
  USING (realm_id = get_user_realm_id());

CREATE TRIGGER trg_subtasks_realm
BEFORE INSERT ON subtasks
FOR EACH ROW
EXECUTE FUNCTION auto_populate_realm_and_user();

GRANT ALL ON subtasks TO authenticated;

-- ===========================================================================
-- MILESTONES
-- ===========================================================================
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  subtask_id uuid NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  milestone_date date NOT NULL,
  milestone_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY milestones_select
  ON milestones FOR SELECT
  USING (realm_id = get_user_realm_id());

CREATE POLICY milestones_insert
  ON milestones FOR INSERT
  WITH CHECK (realm_id = get_user_realm_id());

CREATE POLICY milestones_update
  ON milestones FOR UPDATE
  USING (realm_id = get_user_realm_id());

CREATE POLICY milestones_delete
  ON milestones FOR DELETE
  USING (realm_id = get_user_realm_id());

CREATE TRIGGER trg_milestones_realm
BEFORE INSERT ON milestones
FOR EACH ROW
EXECUTE FUNCTION auto_populate_realm_and_user();

GRANT ALL ON milestones TO authenticated;
