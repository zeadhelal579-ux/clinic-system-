// Show completed visits from the patient's own record projection.
import Link from "next/link";
import { redirect } from "next/navigation";
import { clinicDate, clinicDateTime, visitTypeLabel } from "@/lib/format/format";
import { requireRoleOrRedirect } from "@/backend/session";
import { getMyProfile } from "@/backend/reads";
import { getMyRecord } from "@/backend/reads";

export default async function RecordPage() {
  await requireRoleOrRedirect("patient");
  if (!(await getMyProfile()).profileComplete) redirect("/patient/complete-profile");
  const { visits, lastVisit } = await getMyRecord();

  return (
    <main className="workspace-content workspace-content--narrow">
      <div className="screen-heading"><Link href="/patient/home">الرئيسية</Link><h1>السجل الطبي</h1></div>
      {visits.length === 0 && <p className="workspace-panel">مفيش زيارات مكتملة لعرضها.</p>}
      {visits.map((visit) => (
        <details className="workspace-panel" key={visit.appointmentId} open={lastVisit?.appointmentId === visit.appointmentId}>
          <summary>
            {visitTypeLabel[visit.visitType]} · <time dateTime={visit.endedAt}>{clinicDateTime.format(new Date(visit.endedAt))}</time>
          </summary>
          <h2>التشخيص</h2><p>{visit.diagnosis}</p>
          {visit.prescriptions.length > 0 && <>
            <h2>الأدوية</h2>
            <ul>{visit.prescriptions.map((line, index) => <li key={index}>
              {line.drugName} · {line.dose} · {line.duration}
            </li>)}</ul>
          </>}
          {visit.instructions && <><h2>تعليمات الدكتور</h2><p>{visit.instructions}</p></>}
          {visit.followUpDate && <p>المتابعة · <time dateTime={visit.followUpDate}>
            {clinicDate.format(new Date(visit.followUpDate))}
          </time></p>}
        </details>
      ))}
    </main>
  );
}
