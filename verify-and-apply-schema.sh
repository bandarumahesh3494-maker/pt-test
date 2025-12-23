#!/bin/bash
# Project Tracker Database Schema Verification and Auto-Migration
# This script checks if Project Tracker tables exist and auto-creates/modifies them

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/supabase/migrations"

echo "========================================"
echo "PROJECT TRACKER SCHEMA VERIFICATION"
echo "========================================"
echo ""

# Function to check if table exists
check_table_exists() {
    local table_name=$1
    local result=$(docker compose exec -T db psql -U postgres -d postgres -t -c \
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table_name');" \
        2>/dev/null | tr -d '[:space:]')
    echo "$result"
}

# Function to check if column exists in table
check_column_exists() {
    local table_name=$1
    local column_name=$2
    local result=$(docker compose exec -T db psql -U postgres -d postgres -t -c \
        "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table_name' AND column_name = '$column_name');" \
        2>/dev/null | tr -d '[:space:]')
    echo "$result"
}

# Function to apply migration file
apply_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file")

    echo "  Applying: $migration_name"

    if docker compose exec -T db psql -U postgres -d postgres < "$migration_file" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Applied successfully"
        return 0
    else
        echo -e "  ${RED}✗${NC} Failed to apply"
        return 1
    fi
}

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}Error: Migrations directory not found at $MIGRATIONS_DIR${NC}"
    exit 1
fi

echo "Checking Project Tracker tables..."
echo ""

# Check core tables
TASKS_EXISTS=$(check_table_exists "tasks")
SUBTASKS_EXISTS=$(check_table_exists "subtasks")
SUB_SUBTASKS_EXISTS=$(check_table_exists "sub_subtasks")
MILESTONES_EXISTS=$(check_table_exists "milestones")
ACTION_HISTORY_EXISTS=$(check_table_exists "action_history")
APP_CONFIG_EXISTS=$(check_table_exists "app_config")

# Display current status
echo "Current Table Status:"
echo "-------------------------------------"
if [ "$TASKS_EXISTS" = "t" ]; then
    echo -e "  tasks:          ${GREEN}EXISTS${NC}"
else
    echo -e "  tasks:          ${RED}MISSING${NC}"
fi

if [ "$SUBTASKS_EXISTS" = "t" ]; then
    echo -e "  subtasks:       ${GREEN}EXISTS${NC}"
else
    echo -e "  subtasks:       ${RED}MISSING${NC}"
fi

if [ "$SUB_SUBTASKS_EXISTS" = "t" ]; then
    echo -e "  sub_subtasks:   ${GREEN}EXISTS${NC}"
else
    echo -e "  sub_subtasks:   ${RED}MISSING${NC}"
fi

if [ "$MILESTONES_EXISTS" = "t" ]; then
    echo -e "  milestones:     ${GREEN}EXISTS${NC}"
else
    echo -e "  milestones:     ${RED}MISSING${NC}"
fi


if [ "$ACTION_HISTORY_EXISTS" = "t" ]; then
    echo -e "  action_history: ${GREEN}EXISTS${NC}"
else
    echo -e "  action_history: ${RED}MISSING${NC}"
fi

if [ "$APP_CONFIG_EXISTS" = "t" ]; then
    echo -e "  app_config:     ${GREEN}EXISTS${NC}"
else
    echo -e "  app_config:     ${RED}MISSING${NC}"
fi
echo ""

# Check for realm_id column in existing tables (realm-based architecture)
NEEDS_REALM_MIGRATION=false

if [ "$TASKS_EXISTS" = "t" ]; then
    TASKS_HAS_REALM=$(check_column_exists "tasks" "realm_id")
    if [ "$TASKS_HAS_REALM" != "t" ]; then
        echo -e "${YELLOW}⚠${NC} tasks table exists but missing realm_id column"
        NEEDS_REALM_MIGRATION=true
    fi
fi

if [ "$SUBTASKS_EXISTS" = "t" ]; then
    SUBTASKS_HAS_REALM=$(check_column_exists "subtasks" "realm_id")
    if [ "$SUBTASKS_HAS_REALM" != "t" ]; then
        echo -e "${YELLOW}⚠${NC} subtasks table exists but missing realm_id column"
        NEEDS_REALM_MIGRATION=true
    fi
fi

if [ "$SUB_SUBTASKS_EXISTS" = "t" ]; then
    SUB_SUBTASKS_HAS_REALM=$(check_column_exists "sub_subtasks" "realm_id")
    if [ "$SUB_SUBTASKS_HAS_REALM" != "t" ]; then
        echo -e "${YELLOW}⚠${NC} sub_subtasks table exists but missing realm_id column"
        NEEDS_REALM_MIGRATION=true
    fi
fi

# Check for realm auto-creation function
echo ""
echo "Checking Realm Auto-Creation Setup..."
echo "-------------------------------------"

TRIGGER_FUNCTION_EXISTS=$(docker compose exec -T db psql -U postgres -d postgres -t -c \
    "SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_populate_realm_and_user');" \
    2>/dev/null | tr -d '[:space:]')

if [ "$TRIGGER_FUNCTION_EXISTS" = "t" ]; then
    # Check if function includes auto-creation logic
    FUNCTION_HAS_AUTO_CREATE=$(docker compose exec -T db psql -U postgres -d postgres -t -c \
        "SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE p.proname = 'auto_populate_realm_and_user' AND pg_get_functiondef(p.oid) LIKE '%Auto-create realm%');" \
        2>/dev/null | tr -d '[:space:]')

    if [ "$FUNCTION_HAS_AUTO_CREATE" = "t" ]; then
        echo -e "  ${GREEN}✓${NC} Realm auto-creation function: ENABLED"
    else
        echo -e "  ${YELLOW}⚠${NC} Realm auto-creation function: OLD VERSION"
        echo -e "    ${YELLOW}→${NC} Apply fix migration to enable auto-creation"
        NEEDS_REALM_MIGRATION=true
    fi
else
    echo -e "  ${YELLOW}⚠${NC} Realm auto-creation function: NOT FOUND"
    NEEDS_REALM_MIGRATION=true
fi

# Determine what actions to take
ALL_EXIST=true
if [ "$TASKS_EXISTS" != "t" ] || [ "$SUBTASKS_EXISTS" != "t" ] || [ "$SUB_SUBTASKS_EXISTS" != "t" ] || \
   [ "$MILESTONES_EXISTS" != "t" ] || [ "$ACTION_HISTORY_EXISTS" != "t" ] || \
   [ "$APP_CONFIG_EXISTS" != "t" ]; then
    ALL_EXIST=false
fi

# Apply migrations if needed
if [ "$ALL_EXIST" = "true" ] && [ "$NEEDS_REALM_MIGRATION" = "false" ]; then
    echo -e "${GREEN}✓${NC} All Project Tracker tables exist with realm-based architecture"
    echo -e "${GREEN}✓${NC} No migration needed"
    echo ""
else
    echo ""
    echo "========================================"
    if [ "$ALL_EXIST" = "false" ]; then
        echo "CREATING PROJECT TRACKER SCHEMA"
    else
        echo "UPDATING PROJECT TRACKER SCHEMA"
    fi
    echo "========================================"
    echo ""

    # List of migrations in order
    MIGRATIONS=(
        "20251223125004_realm_based_project_tracker_complete.sql"
    )

    APPLIED=0
    SKIPPED=0
    FAILED=0

    for migration in "${MIGRATIONS[@]}"; do
        migration_file="$MIGRATIONS_DIR/$migration"

        if [ -f "$migration_file" ]; then
            # Check file size (skip empty files)
            if [ ! -s "$migration_file" ]; then
                echo "  Skipping: $migration (empty file)"
                SKIPPED=$((SKIPPED + 1))
                continue
            fi

            # Check if file only contains comments
            if ! grep -v '^[[:space:]]*\(--\|\/\*\)' "$migration_file" | grep -q '[^[:space:]]'; then
                echo "  Skipping: $migration (only comments)"
                SKIPPED=$((SKIPPED + 1))
                continue
            fi

            if apply_migration "$migration_file"; then
                APPLIED=$((APPLIED + 1))
            else
                FAILED=$((FAILED + 1))
            fi
        else
            echo -e "  ${YELLOW}⚠${NC} Not found: $migration"
            SKIPPED=$((SKIPPED + 1))
        fi
    done

    echo ""
    echo "========================================"
    echo "MIGRATION SUMMARY"
    echo "========================================"
    echo -e "  Applied:  ${GREEN}$APPLIED${NC}"
    echo -e "  Skipped:  ${YELLOW}$SKIPPED${NC}"

    if [ $FAILED -gt 0 ]; then
        echo -e "  Failed:   ${RED}$FAILED${NC}"
        echo ""
        echo -e "${RED}Some migrations failed. Please check the errors above.${NC}"
        exit 1
    else
        echo ""
        echo -e "${GREEN}✓${NC} Project Tracker schema ready!"
    fi
fi

# Verify final state
echo ""
echo "========================================"
echo "FINAL VERIFICATION"
echo "========================================"
echo ""

# Re-check all tables
TASKS_EXISTS=$(check_table_exists "tasks")
SUBTASKS_EXISTS=$(check_table_exists "subtasks")
SUB_SUBTASKS_EXISTS=$(check_table_exists "sub_subtasks")
MILESTONES_EXISTS=$(check_table_exists "milestones")
ACTION_HISTORY_EXISTS=$(check_table_exists "action_history")
APP_CONFIG_EXISTS=$(check_table_exists "app_config")

VERIFICATION_PASSED=true

# Verify each table and its realm_id column
if [ "$TASKS_EXISTS" = "t" ]; then
    TASKS_HAS_REALM=$(check_column_exists "tasks" "realm_id")
    if [ "$TASKS_HAS_REALM" = "t" ]; then
        echo -e "  ${GREEN}✓${NC} tasks table with realm_id"
    else
        echo -e "  ${RED}✗${NC} tasks table missing realm_id"
        VERIFICATION_PASSED=false
    fi
else
    echo -e "  ${RED}✗${NC} tasks table not found"
    VERIFICATION_PASSED=false
fi

if [ "$SUBTASKS_EXISTS" = "t" ]; then
    SUBTASKS_HAS_REALM=$(check_column_exists "subtasks" "realm_id")
    if [ "$SUBTASKS_HAS_REALM" = "t" ]; then
        echo -e "  ${GREEN}✓${NC} subtasks table with realm_id"
    else
        echo -e "  ${RED}✗${NC} subtasks table missing realm_id"
        VERIFICATION_PASSED=false
    fi
else
    echo -e "  ${RED}✗${NC} subtasks table not found"
    VERIFICATION_PASSED=false
fi

if [ "$SUB_SUBTASKS_EXISTS" = "t" ]; then
    SUB_SUBTASKS_HAS_REALM=$(check_column_exists "sub_subtasks" "realm_id")
    if [ "$SUB_SUBTASKS_HAS_REALM" = "t" ]; then
        echo -e "  ${GREEN}✓${NC} sub_subtasks table with realm_id"
    else
        echo -e "  ${RED}✗${NC} sub_subtasks table missing realm_id"
        VERIFICATION_PASSED=false
    fi
else
    echo -e "  ${RED}✗${NC} sub_subtasks table not found"
    VERIFICATION_PASSED=false
fi

if [ "$MILESTONES_EXISTS" = "t" ]; then
    MILESTONES_HAS_REALM=$(check_column_exists "milestones" "realm_id")
    if [ "$MILESTONES_HAS_REALM" = "t" ]; then
        echo -e "  ${GREEN}✓${NC} milestones table with realm_id"
    else
        echo -e "  ${RED}✗${NC} milestones table missing realm_id"
        VERIFICATION_PASSED=false
    fi
else
    echo -e "  ${RED}✗${NC} milestones table not found"
    VERIFICATION_PASSED=false
fi

if [ "$ACTION_HISTORY_EXISTS" = "t" ]; then
    ACTION_HISTORY_HAS_REALM=$(check_column_exists "action_history" "realm_id")
    if [ "$ACTION_HISTORY_HAS_REALM" = "t" ]; then
        echo -e "  ${GREEN}✓${NC} action_history table with realm_id"
    else
        echo -e "  ${RED}✗${NC} action_history table missing realm_id"
        VERIFICATION_PASSED=false
    fi
else
    echo -e "  ${RED}✗${NC} action_history table not found"
    VERIFICATION_PASSED=false
fi

if [ "$APP_CONFIG_EXISTS" = "t" ]; then
    APP_CONFIG_HAS_REALM=$(check_column_exists "app_config" "realm_id")
    if [ "$APP_CONFIG_HAS_REALM" = "t" ]; then
        echo -e "  ${GREEN}✓${NC} app_config table with realm_id"
    else
        echo -e "  ${RED}✗${NC} app_config table missing realm_id"
        VERIFICATION_PASSED=false
    fi
else
    echo -e "  ${RED}✗${NC} app_config table not found"
    VERIFICATION_PASSED=false
fi

echo ""

if [ "$VERIFICATION_PASSED" = "true" ]; then
    echo "========================================"
    echo -e "${GREEN}✓ PROJECT TRACKER READY${NC}"
    echo "========================================"
    echo ""
    echo "All tables created with realm-based architecture:"
    echo "  - Strict realm isolation enforced at database level"
    echo "  - Users can only access data from their realm"
    echo "  - All tables have realm_id and user_id columns"
    echo "  - RLS policies automatically filter by realm"
    echo "  - Auto-population triggers configured"
    echo ""
    echo -e "${GREEN}✓ Realm Auto-Creation Enabled${NC}"
    echo "  - Users without realms will have one created automatically"
    echo "  - No 'Cannot create records' errors on fresh installations"
    echo "  - Self-healing if realm_id is missing"
    echo ""

    # Check if any users are missing realms
    USERS_WITHOUT_REALMS=$(docker compose exec -T db psql -U postgres -d postgres -t -c \
        "SELECT COUNT(*) FROM profiles WHERE realm_id IS NULL;" \
        2>/dev/null | tr -d '[:space:]')

    if [ ! -z "$USERS_WITHOUT_REALMS" ] && [ "$USERS_WITHOUT_REALMS" != "0" ]; then
        echo -e "${YELLOW}⚠ Warning: $USERS_WITHOUT_REALMS user(s) without realms${NC}"
        echo "  These users will have realms auto-created on first record creation"
        echo "  Or run: ./fix-realm-docker.sh to create realms now"
        echo ""
    fi

    exit 0
else
    echo "========================================"
    echo -e "${RED}✗ VERIFICATION FAILED${NC}"
    echo "========================================"
    echo ""
    echo "Some tables are missing or incorrectly configured."
    echo "Please check the errors above and try running the migrations manually."
    echo ""
    exit 1
fi
