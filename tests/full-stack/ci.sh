#!/usr/bin/env bash
# Exercise the clinic on a disposable local Supabase CLI stack.
set -euo pipefail

root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)
cd "$root/back-end"

frontend_pid=
backend_pid=
cleanup() {
  for pid in "$frontend_pid" "$backend_pid"; do
    if [[ -n "$pid" ]]; then kill "$pid" 2>/dev/null || true; fi
  done
  (cd "$root/back-end" && pnpm exec supabase stop --no-backup) >/dev/null 2>&1 || true
}
if pnpm exec supabase status >/dev/null 2>&1; then
  echo "A local stack is already running. Use this script in a fresh CI job." >&2
  exit 1
fi
trap cleanup EXIT

pnpm exec supabase start
pnpm exec supabase db reset --local
status=$(pnpm exec supabase status -o json)
SUPABASE_URL=$(jq -er '.API_URL' <<<"$status")
SUPABASE_PUBLISHABLE_KEY=$(jq -er '.ANON_KEY' <<<"$status")
CLINIC_TEST_SUPABASE_ADMIN_KEY=$(jq -er '.SERVICE_ROLE_KEY' <<<"$status")
CLINIC_TEST_DB_URL=$(jq -er '.DB_URL' <<<"$status")
export SUPABASE_URL SUPABASE_PUBLISHABLE_KEY CLINIC_TEST_SUPABASE_ADMIN_KEY CLINIC_TEST_DB_URL
unset status

if [[ "$SUPABASE_URL" != "http://127.0.0.1:54321" || "$CLINIC_TEST_DB_URL" != *@127.0.0.1:54322/postgres ]]; then
  echo "The fixture suite requires a fresh Supabase CLI instance on loopback." >&2
  exit 1
fi

psql "$CLINIC_TEST_DB_URL" -X -q -v ON_ERROR_STOP=1 -f supabase/tests/database/clinic-workflow.test.sql

export NEXT_PUBLIC_TURNSTILE_SITE_KEY=local-fixture-only
export CLINIC_TEST_APP_URL=http://127.0.0.1:3000
export CLINIC_BACKEND_URL=http://127.0.0.1:3001
export CLINIC_INTERNAL_TOKEN=$(node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))')
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3001 >"${RUNNER_TEMP:-/tmp}/clinic-backend.log" 2>&1 &
backend_pid=$!
node "$root/front-end/node_modules/next/dist/bin/next" dev "$root/front-end" --hostname 127.0.0.1 --port 3000 >"${RUNNER_TEMP:-/tmp}/clinic-frontend.log" 2>&1 &
frontend_pid=$!
curl --fail --silent --show-error --retry 20 --retry-connrefused --max-time 15 "$CLINIC_TEST_APP_URL/login" >/dev/null
node tests/integration/supabase-workflow.mjs
cd "$root"
python -B -u back-end/tests/full-stack/http_smoke.py
python -B -u back-end/tests/full-stack/browser.py
