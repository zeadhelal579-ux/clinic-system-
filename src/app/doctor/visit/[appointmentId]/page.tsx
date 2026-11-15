// Load an authorized clinical visit, its medical alerts, and previous visits.
import Link from "next/link";
import { notFound } from "next/navigation";
import { VisitForm } from "@/features/visit/VisitForm";
import { AlertsEditDialog } from "@/features/profile/AlertsEditDialog";
import { clinicDateTime, visitTypeLabel } from "@/lib/format/format";
import { getBookingCalendar } from "@/lib/time/booking-calendar";
import { addClinicDays } from "@/lib/time/clinic-time";
import { requireRoleOrRedirect } from "@/backend/session";
import { AppError } from "@/contracts/app-error";
import { appointmentIdSchema } from "@/contracts/input";
import { getVisitContext } from "@/backend/reads";

export default async function VisitPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  await requireRoleOrRedirect("doctor");
  const input = appointmentIdSchema.safeParse(await params);
  if (!input.success) notFound();
  const context = await getVisitContext(input.data).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  const { patient, appointment, alerts, lastVisit, olderVisits } = context;
  const pastVisits = lastVisit ? [lastVisit, ...olderVisits] : olderVisits;

  return (
    <main className="workspace-content">
      <div className="screen-heading">
        <Link href="/doctor/queue">الرجوع للدور</Link>
        <h1>الكشف · <bdi>{patient.fullName}</bdi></h1>
        <p>{patient.age.toLocaleString("ar-EG")} سنة · <bdi dir="ltr">{patient.phone}</bdi> · {visitTypeLabel[appointment.visitType]}</p>
      </div>
      <section className="workspace-panel">
        <AlertsEditDialog patientId={patient.id} alerts={alerts} />
      </section>
      <section className="workspace-panel">
        <h2>الزيارات السابقة</h2>
        {pastVisits.length === 0 && <p className="muted">مفيش زيارات سابقة.</p>}
        {pastVisits.map((visit) => (
          <details key={visit.appointmentId} open={visit.appointmentId === lastVisit?.appointmentId}>
            <summary><time dateTime={visit.endedAt}>{clinicDateTime.format(new Date(visit.endedAt))}</time></summary>
            <p>التشخيص · {visit.diagnosis}</p>
            {visit.instructions && <p>التعليمات · {visit.instructions}</p>}
            {visit.followUpDate && <p>المتابعة · <bdi dir="ltr">{visit.followUpDate}</bdi></p>}
            {visit.prescriptions.length > 0 && <ul>{visit.prescriptions.map((line, index) => (
              <li key={index}>{line.drugName} · {line.dose} · {line.duration}</li>
            ))}</ul>}
            {visit.privateNote && <p>ملاحظة خاصة · {visit.privateNote}</p>}
          </details>
        ))}
      </section>
      {appointment.status === "arrived" ? <VisitForm appointmentId={appointment.id}
        minFollowUpDate={addClinicDays(getBookingCalendar().today, 1)} /> :
        <p className="workspace-panel" role="status">الموعد غير متاح لإنهاء الكشف. راجع حالته في الدور.</p>}
    </main>
  );
}

