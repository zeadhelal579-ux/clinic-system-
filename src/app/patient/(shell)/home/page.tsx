// Show the next appointment for a patient with a completed profile.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UpcomingAppointmentCard } from "@/features/booking/UpcomingAppointmentCard";
import { clinicDate } from "@/lib/format/format";
import { getFollowUpBanner } from "@/backend/reads";
import { requireRoleOrRedirect } from "@/backend/session";
import { listMyAppointments } from "@/backend/reads";
import { getMyProfile } from "@/backend/reads";

export const metadata: Metadata = { title: "الرئيسية" };

export default async function PatientHomePage() {
  await requireRoleOrRedirect("patient");
  const { patient, profileComplete } = await getMyProfile();
  if (!profileComplete || !patient) redirect("/patient/complete-profile");
  const [{ next, upcoming }, { followUpDate }] = await Promise.all([
    listMyAppointments(), getFollowUpBanner(),
  ]);

  return (
    <main className="workspace-content workspace-content--narrow">
      <h1>أهلًا، <bdi>{patient.fullName}</bdi></h1>
      <Link href="/patient/book" className="button button--primary">احجز موعد</Link>
      <Link href="/patient/record" className="button button--secondary">السجل الطبي</Link>
      <Link href="/patient/my-data" className="button button--secondary">بياناتي</Link>
      {followUpDate && <section className="workspace-panel">
        <h2>زيارة متابعة</h2>
        <p>الدكتور أوصى بمتابعة يوم <time dateTime={followUpDate}>{clinicDate.format(new Date(followUpDate))}</time>.</p>
        <Link className="button button--secondary" href={`/patient/book?type=follow_up&date=${followUpDate}`}>احجز متابعة</Link>
      </section>}
      <section className="workspace-panel" aria-labelledby="appointment-title">
        <h2 id="appointment-title">موعدك القادم</h2>
        {next ? <UpcomingAppointmentCard appointment={next} /> :
          <p className="muted">مفيش مواعيد قادمة.</p>}
      </section>
      {upcoming.length > 0 && <section className="workspace-panel">
        <h2>مواعيد قادمة أخرى</h2>
        {upcoming.map((appointment) => <UpcomingAppointmentCard key={appointment.id} appointment={appointment} />)}
      </section>}
    </main>
  );
}
