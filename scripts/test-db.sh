#!/usr/bin/env bash
set -euo pipefail
# This runner intentionally targets only the disposable local Supabase instance.
# CI runs psql inside the local Supabase database container; no host package install is needed.
case "${PAVIS_TEST_DB_MODE:-local}" in
  local) psql_command=(psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -X -v ON_ERROR_STOP=1) ;;
  container) psql_command=(docker exec -i supabase_db_PAVIS psql -U postgres -d postgres -X -v ON_ERROR_STOP=1) ;;
  *) printf 'Unsupported local test database mode\n' >&2; exit 2 ;;
esac
for test_file in supabase/tests/organization_isolation.sql supabase/tests/organization_access_extended.sql supabase/tests/membership_admin.sql supabase/tests/user_profiles.sql supabase/tests/organization_invitations.sql supabase/tests/organization_role_matrix.sql supabase/tests/patent_registry.sql supabase/tests/patent_portfolios.sql supabase/tests/registry_recycle_bin.sql supabase/tests/organization_delete.sql supabase/tests/patent_legal_events.sql supabase/tests/valuation_assessments.sql supabase/tests/valuation_models.sql supabase/tests/royalty_dcf_assessments.sql; do
  printf 'Running %s\n' "$test_file"
  PGPASSWORD=postgres "${psql_command[@]}" < "$test_file"
done

printf "Running concurrent administrator changes\n"
python3 scripts/test-last-admin-concurrency.py
