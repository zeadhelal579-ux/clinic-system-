# Clinic Booking and Patient Records

An Arabic clinic portal for patients, reception staff, and doctors. Patients book appointments and review past visits, reception staff manage schedules and queues, and doctors document visits and review patient records.

**Status:** Local full-stack pilot with a standalone patient showcase for client review.

## Branches

| Branch | Contents |
| --- | --- |
| [`main`](https://github.com/zeadhelal579-ux/clinic-system-/tree/main) | Project overview and links to the three implementations. |
| [`front-deployment`](https://github.com/zeadhelal579-ux/clinic-system-/tree/front-deployment) | Static Arabic showcase with one-click patient access, fictional appointments and visit records, and Vercel configuration. |
| [`front-end`](https://github.com/zeadhelal579-ux/clinic-system-/tree/front-end) | Connected Next.js interface for patients, reception staff, and doctors. |
| [`back-end`](https://github.com/zeadhelal579-ux/clinic-system-/tree/back-end) | Next.js API, clinic workflows, Supabase migrations, and tests. |

## Try the patient showcase

Clone the demo branch and serve its `public` directory with Python 3.

```sh
git clone --branch front-deployment --single-branch https://github.com/zeadhelal579-ux/clinic-system-.git clinic-demo
cd clinic-demo
python -m http.server 8000 --directory public
```

Open `http://localhost:8000` and select **جرّب حساب المريض**. Try updating the sample appointment, viewing visit details, and restoring the sample data. Appointment changes stay in the current browser.

## Run the connected system

Start with the [backend setup](https://github.com/zeadhelal579-ux/clinic-system-/tree/back-end), then follow the [frontend setup](https://github.com/zeadhelal579-ux/clinic-system-/tree/front-end). In the connected system, the browser talks to the Next.js frontend. Its server relays requests to the backend, which verifies user roles and works with Supabase Auth and PostgreSQL.

