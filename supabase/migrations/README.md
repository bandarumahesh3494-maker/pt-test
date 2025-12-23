# Project Tracker Migrations

## Current Status

**The Project Tracker schema has been converted to realm-based access control.**

### Active Migration

Use this migration file:
- **`20251222000000_realm_based_project_tracker.sql`** - Complete realm-based schema

This migration:
- Drops and recreates all Project Tracker tables with realm support
- Adds `realm_id` and `user_id` to all tables
- Sets up Row Level Security (RLS) for realm isolation
- Creates auto-population triggers
- Enforces realm-based access at database level

### Old Migrations (Obsolete)

These files are kept for reference but should NOT be used:
- `20251205012545_create_project_tracker_schema.sql` - Original schema without realms
- `20251205014639_add_sub_subtasks.sql` - Old sub-subtasks schema
- `20251205162645_add_config_table.sql` - Old config without realm_id
- `20251205163623_add_opacity_to_row_colors.sql` - Old config updates
- `20251205163758_add_priority_to_tasks.sql` - Old priority field
- `20251205164252_add_category_colors_config.sql` - Old config
- `20251205181308_add_assigned_to_sub_subtasks.sql` - Old assignment
- `20251205181909_add_category_opacity_config.sql` - Old config
- `20251205204421_fix_milestones_sub_subtask_constraint.sql` - Old constraint
- `20251208155929_add_action_history_table.sql` - Old action history without realm_id
- `20251209015123_update_user_roles_to_user_admin_fixed.sql` - Old roles

## Database Schema

All Project Tracker tables now include:

```sql
-- Every table has these columns
realm_id uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE
user_id uuid REFERENCES profiles(id) ON DELETE SET NULL
```

### Tables

1. **tasks** - Project tasks with realm isolation
2. **subtasks** - Task breakdowns with realm isolation
3. **sub_subtasks** - Further breakdowns with realm isolation
4. **milestones** - Task milestones with realm isolation
5. **action_history** - Audit log with realm isolation
6. **app_config** - Per-realm configuration

### Key Features

✅ Automatic `realm_id` and `user_id` population via triggers
✅ Row Level Security (RLS) enforces realm isolation
✅ Users can only access data from their own realm
✅ Task assignment limited to same-realm users
✅ Configuration is per-realm (not global)

## Prerequisites

The realm-based migration requires these core tables to exist:
- `realms` - Organization/tenant table
- `profiles` - User profiles with realm_id
- `realm_members` - User-realm relationships

And these functions:
- `get_user_realm_id()` - Returns current user's realm
- `get_realm_users()` - Returns users in current realm

## How to Apply

### For Fresh Database

If starting fresh, apply migrations in this order:

1. First, apply core multi-tenant schema (from main app)
2. Then apply: `20251222000000_realm_based_project_tracker.sql`

### For Existing Database

If you already ran the old migrations:

1. The new migration drops all old tables
2. Recreates them with realm support
3. **WARNING**: This will delete all existing Project Tracker data
4. Backup data first if needed

### Applying with Supabase CLI

```bash
# If using Supabase CLI
supabase db reset  # Resets database
supabase db push   # Applies all migrations
```

### Applying Manually

```bash
# Connect to your Supabase database
psql "your-connection-string"

# Run the migration
\i 20251222000000_realm_based_project_tracker.sql
```

## Verification

After applying the migration, verify:

```sql
-- Check all tables have realm_id
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_name IN ('tasks', 'subtasks', 'sub_subtasks', 'milestones', 'action_history', 'app_config')
AND column_name = 'realm_id';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('tasks', 'subtasks', 'sub_subtasks', 'milestones', 'action_history', 'app_config');

-- Check policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('tasks', 'subtasks', 'sub_subtasks', 'milestones', 'action_history', 'app_config');
```

## Frontend Impact

After applying this migration, update frontend code to:

1. **Remove manual realm_id filtering** - RLS handles it automatically
2. **Use `get_realm_users()` RPC** - For user assignment dropdowns
3. **Remove auth.users references** - Use profiles table only
4. **Let triggers populate realm_id** - Don't pass it manually

See `PROJECT_TRACKER_REALM_MIGRATION.md` and `REALM_QUICK_REFERENCE.md` for details.

## Rollback

To rollback to non-realm schema:

```sql
-- Drop realm-based tables
DROP TABLE IF EXISTS action_history CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS sub_subtasks CASCADE;
DROP TABLE IF EXISTS subtasks CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS app_config CASCADE;

-- Then re-apply old migrations if needed
```

**Note**: This will delete all data. Backup first!

## Support

For issues:
1. Verify core multi-tenant schema exists (realms, profiles tables)
2. Check that `get_user_realm_id()` function exists
3. Verify user has a profile with realm_id
4. Check RLS policies are active
