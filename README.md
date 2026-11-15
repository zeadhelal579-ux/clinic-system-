# Clinic System Showcase

A standalone Arabic demo of the clinic system. Enter as the doctor, receptionist, or patient from the landing page. Each role has a separate workspace and uses the same fictional clinic data.

**Status:** Static showcase ready for deployment. Patient details, visits, appointments, and imagery are fictional.

## Quick start

From the branch root, use Python 3 to serve the included HTML, CSS, JavaScript, and images.

```sh
python -m http.server 8000 --directory public
```

Open `http://localhost:8000`. The showcase has no package installation, environment variables, or build step.

## What to try

| Role | Workspace |
| --- | --- |
| Receptionist | Register arrivals, find or register patients, book clinic appointments, review and edit online bookings, configure working hours and holidays, and view revenue. |
| Doctor | Start the next visit, open the patient file, review and edit alerts, record diagnoses and medications, complete the visit, and manage visit prices and revenue. |
| Patient | Book, reschedule, or cancel an appointment, view completed visits and follow-up dates, and edit the sample profile. |

For the shared workflow, enter as receptionist and register Salma Hassan's arrival. Switch to the doctor, finish the patients ahead of her, and record her visit. Check the completed visit in the cashbox and in Salma's account. Private notes appear only in the doctor workspace. Existing visit charges stay unchanged when the doctor edits prices.

Changes use browser `localStorage`. Choose **استعادة بيانات العرض كلها** under the patient profile to reset the three workspaces. The connected system is available on the [front-end](https://github.com/zeadhelal579-ux/clinic-system-/tree/front-end) and [back-end](https://github.com/zeadhelal579-ux/clinic-system-/tree/back-end) branches.

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

- [public/index.html](public/index.html) contains the RTL landing and workspace containers.
- [public/assets/app.js](public/assets/app.js) handles navigation and patient interactions.
- [public/assets/staff.js](public/assets/staff.js) and [staff-views.js](public/assets/staff-views.js) provide the doctor and reception dashboards.
- [public/assets/demo-data.js](public/assets/demo-data.js) provides fictional data, a rolling clinic calendar, and browser storage.
- [public/assets](public/assets) contains the stylesheet, icon, and generated clinic photography.

The showcase uses local fictional accounts. SMS, authentication, and database-backed permissions belong to the connected system.

![Generated portrait of a fictional doctor used on the showcase landing page](public/assets/doctor.webp)
