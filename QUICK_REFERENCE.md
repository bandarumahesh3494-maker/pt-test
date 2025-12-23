# Project Tracker Schema Auto-Migration - Quick Reference

## 🚀 Quick Start

### Automatic (Recommended)
```bash
# Schema is auto-checked and applied during deployment
./multi_tenant_deploy.sh --deploy-only
```

### Manual
```bash
# Run verification script directly
bash frontend/project-tracker/verify-and-apply-schema.sh
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `verify-and-apply-schema.sh` | Auto-migration script |
| `SCHEMA_VERIFICATION_README.md` | Full documentation |
| `SCHEMA_AUTO_MIGRATION_COMPLETE.md` | Implementation details |
| `QUICK_REFERENCE.md` | This file |
| `supabase/migrations/*.sql` | Migration SQL files |

## ✅ What Gets Checked

- [x] `tasks` table with `realm_id`
- [x] `subtasks` table with `realm_id`
- [x] `sub_subtasks` table with `realm_id`
- [x] `milestones` table with `realm_id`
- [x] `people` table
- [x] `action_history` table with `realm_id`
- [x] `app_config` table with `realm_id`

## 🔄 Migration Flow

```
1. Check if tables exist
   ↓
2. Check if realm_id columns exist
   ↓
3. Determine action needed:
   - All good → Skip
   - Missing tables → Create
   - Missing realm_id → Update
   ↓
4. Apply migrations in order
   ↓
5. Verify final state
   ↓
6. Report success/failure
```

## 📋 Common Commands

### Check Database Tables
```bash
# List all Project Tracker tables
docker compose exec db psql -U postgres -d postgres -c "\dt"

# Check specific table structure
docker compose exec db psql -U postgres -d postgres -c "\d tasks"

# Check for realm_id column
docker compose exec db psql -U postgres -d postgres -c \
  "SELECT column_name FROM information_schema.columns WHERE table_name='tasks';"
```

### Manual Migration
```bash
# Apply specific migration
docker compose exec -T db psql -U postgres -d postgres < \
  frontend/project-tracker/supabase/migrations/20251205012545_create_project_tracker_schema.sql

# Apply all migrations
for file in frontend/project-tracker/supabase/migrations/*.sql; do
  docker compose exec -T db psql -U postgres -d postgres < "$file"
done
```

### Reset Schema
```bash
# Drop all Project Tracker tables
docker compose exec -T db psql -U postgres -d postgres <<EOF
DROP TABLE IF EXISTS action_history CASCADE;
DROP TABLE IF EXISTS sub_subtasks CASCADE;
DROP TABLE IF EXISTS subtasks CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS app_config CASCADE;
EOF

# Re-run verification to recreate
bash frontend/project-tracker/verify-and-apply-schema.sh
```

## 🎨 Output Colors

- 🟢 **Green** - Success
- 🟡 **Yellow** - Warning or skipped
- 🔴 **Red** - Error or failure
- 🔵 **Blue** - Information

## 🐛 Troubleshooting

### Script Not Found
```bash
# Ensure you're in project root
pwd  # Should show .../project

# Check if file exists
ls -la frontend/project-tracker/verify-and-apply-schema.sh

# Make executable if needed
chmod +x frontend/project-tracker/verify-and-apply-schema.sh
```

### Database Not Running
```bash
# Check Docker containers
docker compose ps

# Start database
docker compose up -d db

# Wait for database to be ready
docker compose exec db pg_isready -U postgres
```

### Migration Failed
```bash
# View database logs
docker compose logs db --tail=50

# Check migration file syntax
cat frontend/project-tracker/supabase/migrations/FILENAME.sql

# Try applying manually with verbose output
docker compose exec -T db psql -U postgres -d postgres < \
  frontend/project-tracker/supabase/migrations/FILENAME.sql
```

### Permission Errors
```bash
# Grant permissions to postgres user
docker compose exec db psql -U postgres -d postgres <<EOF
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;
EOF
```

## 📊 Verification Examples

### Check All Tables Exist
```bash
docker compose exec db psql -U postgres -d postgres <<EOF
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('tasks', 'subtasks', 'sub_subtasks',
                     'milestones', 'people', 'action_history', 'app_config')
ORDER BY table_name;
EOF
```

### Check realm_id Columns
```bash
docker compose exec db psql -U postgres -d postgres <<EOF
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'realm_id'
ORDER BY table_name;
EOF
```

### Check RLS Policies
```bash
docker compose exec db psql -U postgres -d postgres <<EOF
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('tasks', 'subtasks', 'sub_subtasks',
                    'milestones', 'action_history', 'app_config')
ORDER BY tablename, policyname;
EOF
```

### Check Triggers
```bash
docker compose exec db psql -U postgres -d postgres <<EOF
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('tasks', 'subtasks', 'sub_subtasks',
                              'milestones', 'action_history', 'app_config')
ORDER BY event_object_table, trigger_name;
EOF
```

## 🔐 Security Check

```bash
# Verify RLS is enabled
docker compose exec db psql -U postgres -d postgres <<EOF
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tasks', 'subtasks', 'sub_subtasks',
                    'milestones', 'action_history', 'app_config');
EOF
```

Expected output: All tables should have `rowsecurity = true`

## 🧪 Test Data

### Create Test Realm
```sql
INSERT INTO realms (slug, name, is_superadmin_realm)
VALUES ('test-realm', 'Test Realm', false)
RETURNING id;
```

### Create Test User in Realm
```sql
-- Insert into auth.users first (via Supabase Auth API)
-- Then create profile
INSERT INTO profiles (id, email, role, realm_id)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
  'admin',
  (SELECT id FROM realms WHERE slug = 'test-realm')
);
```

### Create Test Task
```sql
INSERT INTO tasks (name, category, realm_id, user_id)
VALUES (
  'Test Task',
  'dev',
  (SELECT id FROM realms WHERE slug = 'test-realm'),
  '00000000-0000-0000-0000-000000000001'
);
```

## 📝 Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success - all tables verified |
| `1` | Failure - migrations failed or tables missing |

## 🔗 Integration Points

### In multi_tenant_deploy.sh
```bash
# Line ~1188: Project Tracker schema verification
bash frontend/project-tracker/verify-and-apply-schema.sh
```

### Deployment Steps
```
Step 1:   Start database
Step 2:   Start auth service
Step 3:   Apply migrations
  ...
  3.11.9: ⭐ Project Tracker Schema Verification ⭐
  ...
Step 4:   Start core services
Step 5:   Start monitoring
```

## 📚 Documentation Files

- **SCHEMA_VERIFICATION_README.md** - Complete guide (360 lines)
- **SCHEMA_AUTO_MIGRATION_COMPLETE.md** - Implementation details (400 lines)
- **QUICK_REFERENCE.md** - This file (cheat sheet)
- **REALM_QUICK_REFERENCE.md** - Realm architecture guide
- **PROJECT_TRACKER_REALM_MIGRATION.md** - Migration details

## 🎯 Key Features

- ✅ Automatic schema verification
- ✅ Idempotent migrations
- ✅ Realm-based multi-tenancy
- ✅ RLS policy enforcement
- ✅ Auto-population triggers
- ✅ Clear error reporting
- ✅ Zero manual intervention
- ✅ Production ready

## 💡 Pro Tips

1. **Always run from project root**: The script expects to be run from the project root directory

2. **Check logs on failure**: Use `docker compose logs db --tail=50` to see detailed errors

3. **Test locally first**: Use manual commands to test migrations before deploying

4. **Idempotent is safe**: Running the script multiple times won't cause issues

5. **Use verbose mode**: Add `-x` to bash for detailed execution: `bash -x verify-and-apply-schema.sh`

## 🚨 Important Notes

- Script requires Docker and database to be running
- Uses `profiles` table (not `auth.users`) for foreign keys
- All tables must have `realm_id` for multi-tenancy
- RLS policies enforce realm isolation automatically
- Triggers auto-populate `realm_id` and `user_id`

## ⚡ Quick Commands Reference

```bash
# Run deployment with Project Tracker auto-migration
./multi_tenant_deploy.sh --deploy-only

# Run schema verification manually
bash frontend/project-tracker/verify-and-apply-schema.sh

# Check deployment logs
docker compose logs -f

# View database tables
docker compose exec db psql -U postgres -d postgres -c "\dt"

# Access database shell
docker compose exec db psql -U postgres -d postgres

# View Project Tracker logs
docker compose logs project-tracker

# Restart project tracker service
docker compose restart project-tracker
```

## 📞 Getting Help

1. Check `SCHEMA_VERIFICATION_README.md` for detailed documentation
2. Review migration SQL files in `supabase/migrations/`
3. Check database logs: `docker compose logs db`
4. Verify Docker status: `docker compose ps`
5. Test manually: Run SQL queries directly

---

**Remember**: The script runs automatically during deployment. Manual execution is only needed for testing or troubleshooting!
