// Let doctors read the selected medical file and update its clinical alerts.
import { notFound } from "next/navigation";
import { PatientsBrowser, type PatientSearchParams } from "@/features/patients/PatientsBrowser";
import { AlertsEditDialog } from "@/features/profile/AlertsEditDialog";
import { clinicDateTime } from "@/lib/format/format";
import { requireRoleOrRedirect } from "@/backend/session";
import { AppError } from "@/contracts/app-error";
import { getPatientMedicalFile } from "@/backend/reads";

export default async function DoctorPatients({ searchParams }: { searchParams: Promise<PatientSearchParams> }) {
  await requireRoleOrRedirect("doctor");
  return <PatientsBrowser role="doctor" query={await searchParams}
    renderPatient={(patientId) => <MedicalFile patientId={patientId} />} />;
}

async function MedicalFile({ patientId }: { patientId: string }) {
  const { patient, alerts, visits } = await getPatientMedicalFile({ patientId }).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  return (
    <section className="workspace-panel">
      <h2><bdi>{patient.fullName}</bdi></h2>
      <p>{patient.age.toLocaleString("ar-EG")} سنة · <bdi dir="ltr">{patient.phone}</bdi></p>
      <AlertsEditDialog key={patient.id} patientId={patient.id} alerts={alerts} />
      <h2>الزيارات المكتملة</h2>
      {visits.length === 0 && <p className="muted">مفيش زيارات مكتملة.</p>}
      {visits.map((visit) => <details key={visit.appointmentId} open={visit.appointmentId === visits[0]?.appointmentId}>
        <summary><time dateTime={visit.endedAt}>{clinicDateTime.format(new Date(visit.endedAt))}</time></summary>
        <p>التشخيص · {visit.diagnosis}</p>
        {visit.instructions && <p>التعليمات · {visit.instructions}</p>}
        {visit.followUpDate && <p>المتابعة · <bdi dir="ltr">{visit.followUpDate}</bdi></p>}
        {visit.prescriptions.length > 0 && <ul>{visit.prescriptions.map((drug, index) => (
          <li key={index}>{drug.drugName} · {drug.dose} · {drug.duration}</li>
        ))}</ul>}
        {visit.privateNote && <p>ملاحظة خاصة · {visit.privateNote}</p>}
      </details>)}
    </section>
  );
}
