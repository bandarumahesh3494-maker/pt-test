/*
  # Add Action History Table

  1. New Tables
    - `action_history`
      - `id` (uuid, primary key) - Unique identifier for the history record
      - `action_type` (text) - Type of action: 'create', 'update', 'delete'
      - `entity_type` (text) - Type of entity: 'task', 'subtask', 'sub_subtask', 'milestone'
      - `entity_id` (uuid) - ID of the entity that was modified
      - `entity_name` (text) - Name/description of the entity for display
      - `details` (jsonb) - Additional details about the change
      - `performed_by` (text, nullable) - User who performed the action
      - `created_at` (timestamptz) - When the action occurred

  2. Security
    - Enable RLS on `action_history` table
    - Add policy for all users to read history
    - Add policy for all users to insert history

  3. Indexes
    - Index on entity_type and entity_id for faster lookups
    - Index on created_at for chronological queries
*/

CREATE TABLE IF NOT EXISTS action_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('create', 'update', 'delete')),
  entity_type text NOT NULL CHECK (entity_type IN ('task', 'subtask', 'sub_subtask', 'milestone')),
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
CREATE INDEX IF NOT EXISTS idx_action_history_action_type ON action_history(action_type);

CREATE POLICY "Users can view action_history in their realm"
  ON action_history FOR SELECT
  TO authenticated
  USING (realm_id = get_user_realm_id());

CREATE POLICY "Users can create action_history in their realm"
  ON action_history FOR INSERT
  TO authenticated
  WITH CHECK (realm_id = get_user_realm_id());

-- Auto-populate trigger
CREATE TRIGGER auto_populate_action_history_realm_user
  BEFORE INSERT ON action_history
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_realm_and_user();

GRANT SELECT, INSERT ON action_history TO authenticated;
