/*
  # Consolidated Trigger Functions
  
  This migration includes all trigger functions for the project tracker system:
  
  1. Auto-create profile on user signup
  2. Auto-update updated_at timestamps
  3. Auto-populate realm_id from user profile
  
  ## Functions
  - handle_new_user() - Creates profile when new auth user is created
  - update_updated_at() - Updates updated_at timestamp on row changes
  - auto_set_realm_id() - Automatically sets realm_id from user's profile
*/

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_active, state)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    true,
    'approved'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_realms_updated_at ON realms;
CREATE TRIGGER update_realms_updated_at
  BEFORE UPDATE ON realms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_subtasks_updated_at ON subtasks;
CREATE TRIGGER update_subtasks_updated_at
  BEFORE UPDATE ON subtasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_milestones_updated_at ON milestones;
CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_app_config_updated_at ON app_config;
CREATE TRIGGER update_app_config_updated_at
  BEFORE UPDATE ON app_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to auto-populate realm_id from authenticated user's profile
CREATE OR REPLACE FUNCTION auto_set_realm_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set realm_id if not explicitly provided and user is authenticated
  IF NEW.realm_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT realm_id INTO NEW.realm_id
    FROM profiles
    WHERE id = auth.uid();
  END IF;
  
  -- Always set user_id to current authenticated user if not provided
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply auto_set_realm_id triggers to data tables
DROP TRIGGER IF EXISTS auto_set_realm_id_tasks ON tasks;
CREATE TRIGGER auto_set_realm_id_tasks
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_realm_id();

DROP TRIGGER IF EXISTS auto_set_realm_id_subtasks ON subtasks;
CREATE TRIGGER auto_set_realm_id_subtasks
  BEFORE INSERT ON subtasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_realm_id();

DROP TRIGGER IF EXISTS auto_set_realm_id_sub_subtasks ON sub_subtasks;
CREATE TRIGGER auto_set_realm_id_sub_subtasks
  BEFORE INSERT ON sub_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_realm_id();

DROP TRIGGER IF EXISTS auto_set_realm_id_milestones ON milestones;
CREATE TRIGGER auto_set_realm_id_milestones
  BEFORE INSERT ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_realm_id();

DROP TRIGGER IF EXISTS auto_set_realm_id_action_history ON action_history;
CREATE TRIGGER auto_set_realm_id_action_history
  BEFORE INSERT ON action_history
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_realm_id();
