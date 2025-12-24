/*
  # Auto-assign Default Realm to New Users
  
  This migration updates the user creation trigger to automatically assign
  new users to the default realm and set them as approved and active.
  
  ## Changes
  - Updated handle_new_user() function to auto-assign default realm
  - New users are automatically approved and active
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_realm_id uuid;
BEGIN
  -- Get the default realm ID
  SELECT id INTO default_realm_id
  FROM realms
  WHERE slug = 'default'
  LIMIT 1;

  -- Insert profile with default realm
  INSERT INTO public.profiles (id, email, full_name, realm_id, role, is_active, state)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    default_realm_id,
    'user',
    true,
    'approved'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
