#!/bin/bash
# Diagnose Task Creation 400 Error
# Run this to identify why task creation is failing

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo "TASK CREATION ERROR DIAGNOSTICS"
echo "========================================"
echo ""

# 1. Check if user has realm_id
echo "1. Checking User Realm Status..."
echo "-------------------------------------"
docker compose exec -T db psql -U postgres -d postgres -c "
SELECT
  email,
  id as user_id,
  realm_id,
  CASE
    WHEN realm_id IS NULL THEN '❌ NO REALM'
    ELSE '✓ Has Realm'
  END as status
FROM profiles
ORDER BY created_at DESC
LIMIT 10;
"
echo ""

# 2. Check tasks table structure
echo "2. Checking Tasks Table Structure..."
echo "-------------------------------------"
docker compose exec -T db psql -U postgres -d postgres -c "
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name IN ('id', 'realm_id', 'user_id', 'title', 'category')
ORDER BY ordinal_position;
"
echo ""

# 3. Check if trigger exists
echo "3. Checking Auto-Population Trigger..."
echo "-------------------------------------"
docker compose exec -T db psql -U postgres -d postgres -c "
SELECT
  trigger_name,
  event_manipulation as event,
  action_timing as timing
FROM information_schema.triggers
WHERE event_object_table = 'tasks'
ORDER BY trigger_name;
"
echo ""

# 4. Check trigger function
echo "4. Checking Trigger Function..."
echo "-------------------------------------"
docker compose exec -T db psql -U postgres -d postgres -c "
SELECT
  proname as function_name,
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%Auto-create realm%' THEN '✓ Has Auto-Creation'
    ELSE '❌ OLD VERSION'
  END as status
FROM pg_proc p
WHERE proname = 'auto_populate_realm_and_user';
"
echo ""

# 5. Check RLS policies
echo "5. Checking RLS Policies on Tasks..."
echo "-------------------------------------"
docker compose exec -T db psql -U postgres -d postgres -c "
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as command,
  SUBSTRING(qual::text, 1, 50) as using_clause
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY policyname;
"
echo ""

# 6. Check if realms table exists and has data
echo "6. Checking Realms Table..."
echo "-------------------------------------"
docker compose exec -T db psql -U postgres -d postgres -c "
SELECT
  id,
  name,
  created_at
FROM realms
ORDER BY created_at DESC
LIMIT 5;
"
echo ""

# 7. Test insert with explicit realm_id
echo "7. Testing Manual Task Insert..."
echo "-------------------------------------"
echo "Attempting to insert a test task..."

# Get first user with realm
USER_INFO=$(docker compose exec -T db psql -U postgres -d postgres -t -c "
SELECT id || '|' || realm_id
FROM profiles
WHERE realm_id IS NOT NULL
LIMIT 1;
" | tr -d '[:space:]')

if [ -z "$USER_INFO" ]; then
    echo -e "${RED}❌ No users with realm_id found!${NC}"
    echo ""
    echo "This is the problem! Users don't have realms."
    echo ""
    echo "Fix options:"
    echo "  1. Run: ./fix-realm-docker.sh"
    echo "  2. Or apply: ./verify-and-apply-schema.sh"
    echo ""
    exit 1
fi

USER_ID=$(echo "$USER_INFO" | cut -d'|' -f1)
REALM_ID=$(echo "$USER_INFO" | cut -d'|' -f2)

echo "Using user_id: $USER_ID"
echo "Using realm_id: $REALM_ID"
echo ""

# Try to insert a test task
docker compose exec -T db psql -U postgres -d postgres -c "
INSERT INTO tasks (realm_id, user_id, title, category)
VALUES ('$REALM_ID', '$USER_ID', 'Test Task from Diagnostic', 'General')
RETURNING id, title, realm_id, user_id;
" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Manual insert successful!${NC}"
    echo ""
    echo "This means:"
    echo "  - Table structure is OK"
    echo "  - Permissions are OK"
    echo "  - Problem is likely in the frontend request"
    echo ""
    echo "Check:"
    echo "  1. Is realm_id being sent in the POST request?"
    echo "  2. Is user_id being sent in the POST request?"
    echo "  3. Check browser console for actual error message"
    echo ""

    # Clean up test task
    docker compose exec -T db psql -U postgres -d postgres -c "
    DELETE FROM tasks WHERE title = 'Test Task from Diagnostic';
    " > /dev/null 2>&1
else
    echo -e "${RED}❌ Manual insert failed!${NC}"
    echo ""
    echo "This is a database-level problem."
    echo ""
fi

# 8. Test trigger function
echo ""
echo "8. Testing Trigger Function..."
echo "-------------------------------------"
docker compose exec -T db psql -U postgres -d postgres -c "
-- Try insert without realm_id/user_id
INSERT INTO tasks (title, category)
VALUES ('Trigger Test Task', 'General')
RETURNING id, title, realm_id, user_id,
  CASE
    WHEN realm_id IS NULL THEN '❌ Trigger Not Working'
    ELSE '✓ Trigger Working'
  END as trigger_status;
" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Trigger function working!${NC}"

    # Clean up
    docker compose exec -T db psql -U postgres -d postgres -c "
    DELETE FROM tasks WHERE title = 'Trigger Test Task';
    " > /dev/null 2>&1
else
    echo -e "${RED}❌ Trigger function not working!${NC}"
    echo ""
    echo "Problem: Trigger function is missing or broken"
    echo ""
    echo "Fix:"
    echo "  Run: ./verify-and-apply-schema.sh"
    echo ""
fi

echo ""
echo "========================================"
echo "DIAGNOSTICS COMPLETE"
echo "========================================"
echo ""
echo "Common Issues & Fixes:"
echo ""
echo "1. Users Missing Realms"
echo "   Fix: ./fix-realm-docker.sh"
echo ""
echo "2. Trigger Not Working"
echo "   Fix: ./verify-and-apply-schema.sh"
echo ""
echo "3. Frontend Not Sending realm_id/user_id"
echo "   Check: Browser console for actual POST body"
echo "   Fix: Update frontend to rely on trigger, don't send these fields"
echo ""
echo "4. RLS Policy Blocking Insert"
echo "   Check: Policies allow INSERT for authenticated users"
echo ""
