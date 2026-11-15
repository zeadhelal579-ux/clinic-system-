# Start a fresh loopback-only stack and capture redacted verification summaries.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '../../..')
$pg = 'C:/Program Files/PostgreSQL/18/bin'
$env:PATH = "$pg;$env:PATH"
$temp = Join-Path ([IO.Path]::GetTempPath()) ('clinic-audit-' + [guid]::NewGuid().ToString('N'))
$logs = Join-Path (Get-Location).Path 'back-end/test-results/logs'
New-Item -ItemType Directory -Path $temp,$logs -Force | Out-Null
$processes = @()
$databaseStarted = $false
$pgPort = 56324
$data = Join-Path $temp 'data'

function Invoke-Database {
  param([string[]] $Arguments)
  & "$pg/psql.exe" -h 127.0.0.1 -p $pgPort -U postgres -d postgres -v ON_ERROR_STOP=1 @Arguments
  if ($LASTEXITCODE -ne 0) { throw "psql exited with code $LASTEXITCODE" }
}

function Start-Local {
  param([string] $Name, [string] $Binary, [string[]] $Arguments)
  Start-Process -FilePath $Binary -ArgumentList $Arguments -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $temp "$Name.out") -RedirectStandardError (Join-Path $temp "$Name.err")
}

function Wait-Local {
  param([string] $Url)
  for ($attempt = 0; $attempt -lt 25; $attempt++) {
    try { Invoke-WebRequest $Url -TimeoutSec 2 | Out-Null; return }
    catch { Start-Sleep -Milliseconds 350 }
  }
  throw "Local readiness check failed for $Url"
}

try {
  & "$pg/initdb.exe" -D $data -U postgres -A trust -E UTF8 --no-locale | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'initdb failed' }
  & "$pg/pg_ctl.exe" -D $data -l (Join-Path $temp 'postgres.log') -o "-p $pgPort -h 127.0.0.1" -w start
  if ($LASTEXITCODE -ne 0) { throw 'pg_ctl failed' }
  $databaseStarted = $true
  Invoke-Database -Arguments @('-c', 'create schema auth; create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create role authenticator login noinherit; grant anon, authenticated, service_role to authenticator;')

  $env:GOTRUE_JWT_SECRET = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
  $env:GOTRUE_DB_DRIVER = 'postgres'
  $env:GOTRUE_DB_DATABASE_URL = "postgres://postgres@127.0.0.1:${pgPort}/postgres?sslmode=disable&search_path=auth"
  $env:GOTRUE_DB_NAMESPACE = 'auth'
  $env:GOTRUE_SITE_URL = 'http://127.0.0.1:56325'
  $env:API_EXTERNAL_URL = 'http://127.0.0.1:56321'
  $env:GOTRUE_API_HOST = '127.0.0.1'
  $env:GOTRUE_API_PORT = '56322'
  $env:GOTRUE_JWT_ADMIN_ROLES = 'service_role'
  $env:GOTRUE_JWT_DEFAULT_GROUP_NAME = 'authenticated'
  $env:GOTRUE_JWT_EXP = '3600'
  $env:GOTRUE_EXTERNAL_PHONE_ENABLED = 'true'
  $env:GOTRUE_EXTERNAL_EMAIL_ENABLED = 'true'
  $env:GOTRUE_SMS_TEST_OTP = '201000000001:123456,201000000002:234567,201000000003:345678,201000000005:456789'
  $env:GOTRUE_SMS_MAX_FREQUENCY = '1s'
  $env:GOTRUE_RATE_LIMIT_SMS_SENT = '100'
  $hostTemp = 'C:/Users/user/AppData/Local/Temp'
  $processes += Start-Local auth "$hostTemp/clinic-auth-v2.197.0/auth.exe" @()
  Wait-Local 'http://127.0.0.1:56322/health'

  Invoke-Database -Arguments @('-c', 'grant usage on schema auth to authenticated;')
  Get-ChildItem -LiteralPath 'back-end/supabase/migrations' -Filter '*.sql' | Sort-Object Name | ForEach-Object {
    Invoke-Database -Arguments @('-q','-f',$_.FullName)
  }
  Invoke-Database -Arguments @('-q','-f','back-end/supabase/seed.sql')
  Invoke-Database -Arguments @('-q','-f','back-end/supabase/tests/database/clinic-workflow.test.sql') |
    Tee-Object -FilePath (Join-Path $logs 'database.log')

  $dump = Join-Path $temp 'clinic-schema.dump'
  & "$pg/pg_dump.exe" -h 127.0.0.1 -p $pgPort -U postgres -Fc -f $dump postgres
  if ($LASTEXITCODE -ne 0) { throw 'Fixture backup failed' }
  Invoke-Database -Arguments @('-q','-c','create database clinic_restore')
  & "$pg/pg_restore.exe" -h 127.0.0.1 -p $pgPort -U postgres -d clinic_restore --exit-on-error $dump
  if ($LASTEXITCODE -ne 0) { throw 'Fixture restore failed' }
  $seedHours = & "$pg/psql.exe" -h 127.0.0.1 -p $pgPort -U postgres -d clinic_restore -Atc 'select count(*) from public.working_hours'
  if ($LASTEXITCODE -ne 0 -or $seedHours -ne '7') { throw 'Restored seed mismatch' }
  'Fixture dump and restore verified.' | Tee-Object -FilePath (Join-Path $logs 'restore.log')

  $env:PGRST_DB_URI = "postgres://authenticator@127.0.0.1:${pgPort}/postgres"
  $env:PGRST_DB_SCHEMAS = 'public'
  $env:PGRST_DB_ANON_ROLE = 'anon'
  $env:PGRST_JWT_SECRET = $env:GOTRUE_JWT_SECRET
  $env:PGRST_SERVER_HOST = '127.0.0.1'
  $env:PGRST_SERVER_PORT = '56323'
  $node = (Get-Command node).Source
  $processes += Start-Local postgrest "$hostTemp/clinic-postgrest-v16.4/postgrest.exe" @()
  $processes += Start-Local gateway $node @('back-end/tests/full-stack/gateway.mjs')
  $env:SUPABASE_URL = 'http://127.0.0.1:56321'
  $env:SUPABASE_PUBLISHABLE_KEY = & node back-end/tests/full-stack/fixture-tokens.mjs anon
  $env:CLINIC_TEST_SUPABASE_ADMIN_KEY = & node back-end/tests/full-stack/fixture-tokens.mjs service_role
  $env:CLINIC_TEST_APP_URL = 'http://127.0.0.1:56325'
  $env:CLINIC_TEST_DB_URL = "postgresql://postgres@127.0.0.1:${pgPort}/postgres"
  $env:CLINIC_TEST_CHROMIUM = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  $env:NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'local-fixture-only'
  $env:CLINIC_BACKEND_URL = 'http://127.0.0.1:56326'
  $env:CLINIC_INTERNAL_TOKEN = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
  $processes += Start-Local backend $node @('back-end/node_modules/next/dist/bin/next','dev','back-end','--hostname','127.0.0.1','--port','56326')
  $processes += Start-Local frontend $node @('front-end/node_modules/next/dist/bin/next','dev','front-end','--hostname','127.0.0.1','--port','56325')
  Wait-Local 'http://127.0.0.1:56325/login'
  & python -B -u back-end/tests/full-stack/http_smoke.py 2>&1 | Tee-Object -FilePath (Join-Path $logs 'http.log')
  if ($LASTEXITCODE -ne 0) { throw 'HTTP smoke failed' }
  & node back-end/tests/integration/supabase-workflow.mjs 2>&1 | Tee-Object -FilePath (Join-Path $logs 'integration.log')
  if ($LASTEXITCODE -ne 0) { throw 'Integration suite failed' }
  & python -u back-end/tests/full-stack/browser.py 2>&1 | Tee-Object -FilePath (Join-Path $logs 'browser.log')
  if ($LASTEXITCODE -ne 0) { throw 'Browser suite failed' }
} finally {
  foreach ($process in $processes) {
    if (!$process.HasExited) { Stop-Process -Id $process.Id }
  }
  if ($databaseStarted) { & "$pg/pg_ctl.exe" -D $data -m fast -w stop | Out-Null }
  "Diagnostic directory (disposable local fixtures): $temp"
}
