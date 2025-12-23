/*
============================================================================
PROJECT TRACKER – PROFILE.REALM_ID BASED (SIMPLE & CORRECT)
============================================================================

✔ Uses profiles.realm_id
✔ No realm_members dependency
✔ All users in same realm see same data
✔ REST calls require NO payload
✔ Works across refresh / multiple users
*/

-- ============================================================================
-- Helper: Get current user's realm from profile
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_realm_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT p.realm_id
    FROM profiles p
    WHERE p.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_user_realm_id() TO authenticated;

-- ============================================================================
-- Trigger: Auto-populate realm & user
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_populate_realm_and_user()
RETURNS TRIGGER AS $$
DECLARE
  active_realm uuid;
BEGIN
  SELECT realm_id
  INTO active_realm
  FROM profiles
  WHERE id = auth.uid();

  IF active_realm IS NULL THEN
    RAISE EXCEPTION 'User does not have a realm';
  END IF;

  NEW.realm_id := active_realm;
  NEW.user_id := auth.uid();
  NEW.created_by := auth.uid();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TASKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('dev', 'test', 'infra', 'support')),
  priority int DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select"
ON tasks FOR SELECT
USING (realm_id = get_user_realm_id());

CREATE POLICY "tasks_insert"
ON tasks FOR INSERT
WITH CHECK (true);

CREATE POLICY "tasks_update"
ON tasks FOR UPDATE
USING (realm_id = get_user_realm_id());

CREATE POLICY "tasks_delete"
ON tasks FOR DELETE
USING (realm_id = get_user_realm_id());

CREATE TRIGGER trg_tasks_realm
BEFORE INSERT ON tasks
FOR EACH ROW
EXECUTE FUNCTION auto_populate_realm_and_user();

GRANT ALL ON tasks TO authenticated;

-- ============================================================================
-- SUBTASKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name text NOT NULL,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subtasks_select"
ON subtasks FOR SELECT
USING (realm_id = get_user_realm_id());

CREATE POLICY "subtasks_insert"
ON subtasks FOR INSERT
WITH CHECK (true);

CREATE POLICY "subtasks_update"
ON subtasks FOR UPDATE
USING (realm_id = get_user_realm_id());

CREATE POLICY "subtasks_delete"
ON subtasks FOR DELETE
USING (realm_id = get_user_realm_id());

CREATE TRIGGER trg_subtasks_realm
BEFORE INSERT ON subtasks
FOR EACH ROW
EXECUTE FUNCTION auto_populate_realm_and_user();

GRANT ALL ON subtasks TO authenticated;

-- ============================================================================
-- SUB-SUBTASKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sub_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  subtask_id uuid NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index int DEFAULT 0,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sub_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_subtasks_select"
ON sub_subtasks FOR SELECT
USING (realm_id = get_user_realm_id());

CREATE POLICY "sub_subtasks_insert"
ON sub_subtasks FOR INSERT
WITH CHECK (true);

CREATE POLICY "sub_subtasks_update"
ON sub_subtasks FOR UPDATE
USING (realm_id = get_user_realm_id());

CREATE POLICY "sub_subtasks_delete"
ON sub_subtasks FOR DELETE
USING (realm_id = get_user_realm_id());

CREATE TRIGGER trg_sub_subtasks_realm
BEFORE INSERT ON sub_subtasks
FOR EACH ROW
EXECUTE FUNCTION auto_populate_realm_and_user();

GRANT ALL ON sub_subtasks TO authenticated;

-- ============================================================================
-- MILESTONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid NOT NULL REFERENCES realms(id),
  user_id uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  subtask_id uuid REFERENCES subtasks(id),
  sub_subtask_id uuid REFERENCES sub_subtasks(id),
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

CREATE POLICY "milestones_select"
ON milestones FOR SELECT
USING (realm_id = get_user_realm_id());

CREATE POLICY "milestones_insert"
ON milestones FOR INSERT
WITH CHECK (true);

CREATE POLICY "milestones_update"
ON milestones FOR UPDATE
USING (realm_id = get_user_realm_id());

CREATE POLICY "milestones_delete"
ON milestones FOR DELETE
USING (realm_id = get_user_realm_id());

CREATE TRIGGER trg_milestones_realm
BEFORE INSERT ON milestones
FOR EACH ROW
EXECUTE FUNCTION auto_populate_realm_and_user();

GRANT ALL ON milestones TO authenticated;
