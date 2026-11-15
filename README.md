# Clinic Backend

Next.js HTTP service for clinic appointments, patient records, staff queues, scheduling, visits, and cashbox reports. **Status:** Tested locally with disposable data and the connected frontend.

## Quick start

Use Node.js 24, pnpm 11.25.0, and Docker for local Supabase. Run from the backend branch root.

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
pnpm db:start
pnpm db:reset
pnpm exec supabase status
```

`db:reset` recreates the local database from [migrations](supabase/migrations) and the [seed](supabase/seed.sql). Copy the local API URL and public key into `.env.local`.

| Variable | Purpose | Example |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase API origin | `http://127.0.0.1:54321` |
| `SUPABASE_PUBLISHABLE_KEY` | Public Supabase key used with caller sessions | Local public or anon key from `supabase status` |
| `CLINIC_INTERNAL_TOKEN` | Required credential shared with the frontend server | Generate a random value using the command below |
| `NEXT_PUBLIC_APP_URL` | Browser-facing frontend origin checked in hosted phone-change verification | `http://localhost:3000` |
| `TURNSTILE_SECRET_KEY` | Server-side secret for hosted phone-change verification | Secret for the configured Turnstile widget |

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set the generated value in both apps as `CLINIC_INTERNAL_TOKEN`. Then start the backend and follow the [frontend setup](https://github.com/zeadhelal579-ux/clinic-system-/tree/front-end).

```sh
pnpm dev --port 3001
```

## API and database

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/slots` | Read appointment availability. |
| GET | `/api/queue` | Read the clinic queue. |
| GET | `/api/patients/search` | Search patient records within the caller’s permissions. |
| GET | `/api/online-bookings/unseen-count` | Read the unseen online booking count. |
| POST | `/api/internal/{operation}` | Dispatch an allowlisted operation from the frontend server with a bearer credential and the caller’s session when available. |

The [route handlers](src/app/api) call role-checked services. Supabase policies and constraints also govern access and booking consistency. Error bodies contain `code`, `messageKey`, and `requestId`.

To provision a test staff account, set `SUPABASE_SECRET_KEY` and `CLINIC_STAFF_PASSWORD` in the operator’s session, then run `pnpm staff:create secretary staff@example.com` or use the `doctor` role. Before testing booking, set the working schedule as reception and prices as doctor.

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:test
```

The [integration checks](tests/integration) exercise Supabase authentication and booking. For the full browser suite, place checkouts named `back-end/` and `front-end/` side by side, install both apps, and run `bash back-end/tests/full-stack/ci.sh` from their parent on an isolated Docker-capable runner with Python, Playwright, `jq`, and `psql`.

