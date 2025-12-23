/*
  # Add auto-create profile trigger
  
  1. Changes
    - Create function to auto-create profile when user signs up
    - Create trigger on auth.users to call this function
    - Ensure users get assigned to a default shared realm
  
  2. Notes
    - Uses first available realm as default
    - Creates profile with user's email and id
*/

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_realm_id uuid;
BEGIN
  -- Get the first available realm (or create one if none exists)
  SELECT id INTO default_realm_id FROM public.realms LIMIT 1;
  
  -- If no realm exists, create a default one
  IF default_realm_id IS NULL THEN
    INSERT INTO public.realms (name) VALUES ('Default Realm')
    RETURNING id INTO default_realm_id;
  END IF;

  -- Insert profile for new user
  INSERT INTO public.profiles (id, realm_id, email, full_name)
  VALUES (
    NEW.id,
    default_realm_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
