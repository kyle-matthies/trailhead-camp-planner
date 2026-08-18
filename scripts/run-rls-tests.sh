#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROJECT_ID="$(
  awk -F' *= *' '/^project_id/ {
    gsub(/"/, "", $2);
    print $2;
    exit
  }' supabase/config.toml
)"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Could not read project_id from supabase/config.toml" >&2
  exit 1
fi

DB_CONTAINER="supabase_db_${PROJECT_ID}"
TEST_PATH="/tmp/trailhead-camp-planner-rls-test.sql"

cleanup() {
  if [[ "${RLS_TEST_STOP_SUPABASE:-0}" == "1" ]]; then
    supabase stop --project-id "$PROJECT_ID" --no-backup >/dev/null
  fi
}
trap cleanup EXIT

supabase db start
supabase db reset --local --no-seed

docker cp supabase/tests/rls_test.sql "${DB_CONTAINER}:${TEST_PATH}"
output="$(
  docker exec "$DB_CONTAINER" \
    psql -v ON_ERROR_STOP=1 -U postgres -d postgres -f "$TEST_PATH"
)"

echo "$output"
grep -q "ALL 33 RLS ASSERTIONS PASSED" <<< "$output"
