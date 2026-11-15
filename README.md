# Clinic Patient Showcase

A standalone Arabic demo for reviewing the patient experience. Select **جرّب حساب المريض** to open Salma Hassan’s fictional patient account with one click.

**Status:** Static showcase ready for deployment. Patient details, visits, appointments, and imagery are fictional.

## Quick start

From the branch root, use Python 3 to serve the included HTML, CSS, JavaScript, and images.

```sh
python -m http.server 8000 --directory public
```

Open `http://localhost:8000`. The showcase has no package installation, environment variables, or build step.

## What to try

- Open the preloaded upcoming appointment. Change its date, time, or visit type.
- Cancel the upcoming appointment and book another from the available slots.
- Expand past visits under **سجل الزيارات** and view the sample profile under **بياناتي**.
- Select **استعادة بيانات الديمو** to restore the original example. Bookings use browser `localStorage` and are scoped to the current site and browser.

## Deploy on Vercel

| Setting | Value |
| --- | --- |
| Production branch | `front-deployment` |
| Root directory | `./` |
| Framework preset | Other |
| Output directory | `public`, set in [vercel.json](vercel.json) |
| Install and build commands | Leave unset |
| Environment variables | None |

Import the repository, select the branch, and deploy. Open the deployed URL and exercise booking and page reload to verify the hosted site. [Vercel build configuration](https://vercel.com/docs/deployments/configure-a-build)

## Project layout

- [public/index.html](public/index.html) contains the RTL landing and patient portal.
- [public/assets/app.js](public/assets/app.js) handles navigation and patient interactions.
- [public/assets/demo-data.js](public/assets/demo-data.js) provides fictional data, a rolling clinic calendar, and browser storage.
- [public/assets](public/assets) contains the stylesheet, icon, and generated clinic photography.

The showcase simulates the patient journey in a single browser. For staff workflows and database-backed accounts, see the [connected frontend](https://github.com/zeadhelal579-ux/clinic-system-/tree/front-end).

![Generated portrait of a fictional doctor used on the showcase landing page](public/assets/doctor.webp)

