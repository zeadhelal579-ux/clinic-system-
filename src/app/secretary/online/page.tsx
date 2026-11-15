// List the online appointments that reception can manage.
import Link from "next/link";
import { UpcomingAppointmentCard } from "@/features/booking/UpcomingAppointmentCard";
import { OnlineBookingsSeen } from "@/features/online-bookings/OnlineBookingsSeen";
import { clinicDateTime } from "@/lib/format/format";
import { requireRoleOrRedirect } from "@/backend/session";
import { listOnlineBookings } from "@/backend/reads";

export default async function OnlineBookingsPage({ searchParams }: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  await requireRoleOrRedirect("secretary");
  const rawPage = (await searchParams).page;
  const page = typeof rawPage === "string" && /^\d{1,6}$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1;
  const { items, pageSize, total } = await listOnlineBookings({ page });
  const unseen = items.filter((item) => item.isNew).map((item) => item.appointment.id);
  return (
    <main className="workspace-content">
      <div className="screen-heading"><Link prefetch={false} href="/secretary/queue">طابور اليوم</Link><h1>الحجوزات الأونلاين</h1></div>
      {unseen.length > 0 && <OnlineBookingsSeen key={unseen.join(",")} appointmentIds={unseen} />}
      {items.length === 0 && <p className="workspace-panel">مفيش حجوزات أونلاين في الصفحة دي.</p>}
      {items.map(({ appointment, patientName, age, isNew, createdAt }) => (
        <section key={appointment.id} className="workspace-panel">
          <h2><bdi>{patientName}</bdi>{isNew && " · جديد"}</h2>
          <p className="muted">{age.toLocaleString("ar-EG")} سنة · اتعمل الحجز يوم{" "}
            <time dateTime={createdAt}>{clinicDateTime.format(new Date(createdAt))}</time></p>
          <UpcomingAppointmentCard appointment={appointment} editPath="/secretary/new-booking" />
        </section>
      ))}
      {(page > 1 || page * pageSize < total) && <nav className="form-columns" aria-label="صفحات الحجوزات">
        {page > 1 && <Link href={`/secretary/online?page=${page - 1}`}>الصفحة السابقة</Link>}
        {page * pageSize < total && <Link href={`/secretary/online?page=${page + 1}`}>الصفحة التالية</Link>}
      </nav>}
    </main>
  );
}
