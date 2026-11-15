# Clinic Frontend

Arabic Next.js interface for patients, reception staff, and doctors. **Status:** Connected app tested locally with the clinic backend.

## Quick start

Use Node.js 24 and pnpm 11.25.0. Start the [clinic backend](https://github.com/zeadhelal579-ux/clinic-system-/tree/back-end) first, then run these commands from the frontend branch root.

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
```

Set the following in [the environment template](.env.example) copied to `.env.local`.

| Variable | Purpose | Example |
| --- | --- | --- |
| `CLINIC_BACKEND_URL` | Backend origin used by the frontend server | `http://127.0.0.1:3001` |
| `CLINIC_INTERNAL_TOKEN` | Required server-side credential shared with the backend | Generate on the backend and copy the same value |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public CAPTCHA key for authentication and phone-change forms | The test or hosted public site key for your environment |

```sh
pnpm dev --port 3000
```

Open `http://localhost:3000/login`.

## Workspaces

| Workspace | Main flows |
| --- | --- |
| Patient | Register, sign in, manage appointments, view visit records, and update profile details. |
| Reception | Search patient records, register walk-ins, review online bookings, configure schedules, and manage the queue. |
| Doctor | Review the queue, open a visit, review medical history, record the outcome, and set visit prices. |

Pages and layouts live under [src/app](src/app). The frontend server adapters in [src/backend](src/backend) relay reads and commands over HTTP. The backend resolves roles and owns database access.

## Checks and deployment

```sh
pnpm lint
pnpm typecheck
pnpm build
```

Use `pnpm start` after a production build. Configure the connected frontend and backend as separate services and set the CAPTCHA site key before building the frontend. For the static client showcase, use [front-deployment](https://github.com/zeadhelal579-ux/clinic-system-/tree/front-deployment).

