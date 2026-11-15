// Show reception the patient's contact information and appointment history.
import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientsBrowser, type PatientSearchParams } from "@/features/patients/PatientsBrowser";
import { appointmentStatusLabel, clinicDateTime, visitTypeLabel } from "@/lib/format/format";
import { requireRoleOrRedirect } from "@/backend/session";
import { AppError } from "@/contracts/app-error";
import { getPatientSummary } from "@/backend/reads";

export default async function ReceptionPatients({ searchParams }: { searchParams: Promise<PatientSearchParams> }) {
  await requireRoleOrRedirect("secretary");
  return <PatientsBrowser role="secretary" query={await searchParams}
    renderPatient={(patientId) => <ReceptionPatient patientId={patientId} />} />;
}

async function ReceptionPatient({ patientId }: { patientId: string }) {
  const { patient, nextAppointment, previousAppointments } = await getPatientSummary({ patientId }).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  return (
    <section className="workspace-panel">
      <h2><bdi>{patient.fullName}</bdi></h2>
      <p>{patient.age.toLocaleString("ar-EG")} سنة · <bdi dir="ltr">{patient.phone}</bdi> · {patient.address}</p>
      <Link className="button button--primary" href={`/secretary/new-booking?patientId=${patient.id}`}>حجز موعد لهذا المريض</Link>
      <h2>الموعد القادم</h2>
      <p>{nextAppointment ? clinicDateTime.format(new Date(nextAppointment.slotStart)) : "مفيش موعد قادم."}</p>
      <h2>المواعيد السابقة</h2>
      {previousAppointments.length ? <ul>{previousAppointments.map((appointment) => (
        <li key={appointment.id}>
          {clinicDateTime.format(new Date(appointment.slotStart))} · {visitTypeLabel[appointment.visitType]} ·{" "}
          {appointment.isMissed ? "فات موعده" : appointmentStatusLabel[appointment.status]}
        </li>
      ))}</ul> : <p className="muted">مفيش مواعيد سابقة.</p>}
    </section>
  );
}
