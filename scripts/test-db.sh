#!/usr/bin/env bash
set -euo pipefail
# This runner intentionally targets only the disposable local Supabase instance.
for test_file in supabase/tests/organization_isolation.sql supabase/tests/organization_access_extended.sql supabase/tests/membership_admin.sql; do
  printf 'Running %s\n' "$test_file"
  PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -X -v ON_ERROR_STOP=1 -f "$test_file"
done
