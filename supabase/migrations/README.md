# Project Tracker Migrations

## Current Structure

All migrations have been consolidated into **ONE** simple migration file:

- **`complete_project_tracker_schema.sql`** - Complete database schema with authentication and multi-tenancy

## What's Included

This single migration creates:

### 8 Tables
1. **realms** - Organizations/workspaces
2. **profiles** - User profiles (auto-created on signup)
3. **tasks** - Top-level work items
4. **subtasks** - Task breakdowns
5. **sub_subtasks** - Further breakdowns
6. **milestones** - Date-based checkpoints
7. **action_history** - Audit log
8. **app_config** - Application settings

### Automatic Features
- New users auto-create profile in default realm
- Auto-populated realm_id from user's profile
- Auto-updated timestamps
- Row Level Security (RLS) enabled on all tables
- Permissive policies: authenticated users can access all data

### Security Model
- All authenticated users can read/write all data
- realm_id is tracked but not enforced at database level
- Application can filter by realm if needed

## Key Benefits

✅ **Simple**: One file contains everything
✅ **Safe**: Uses IF NOT EXISTS for all objects
✅ **Complete**: Includes tables, indexes, functions, triggers, RLS, and initial data
✅ **Auto-auth**: Users are instantly authenticated on signup

## How It Works

When a new user signs up:
1. Auth user is created
2. Trigger automatically creates profile
3. Profile is assigned to default realm
4. User is set as approved and active
5. User can immediately use the app

When creating tasks/subtasks/milestones:
1. realm_id is auto-set from user's profile
2. user_id is auto-set to current user
3. No manual population needed

## Verification

Check everything is working:

```sql
-- Verify default realm exists
SELECT * FROM realms WHERE slug = 'default';

-- Verify all tables have RLS enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Verify triggers are active
SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public';
```

## No Manual Steps Required

Everything is automatic:
- No need to create realms manually (default realm auto-created)
- No need to approve users (auto-approved)
- No need to assign realm_id (auto-assigned)
- No need to manage permissions (RLS auto-enforced)
