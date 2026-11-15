// Search reception patient records and select one to book an appointment.
import Link from "next/link";
import { FormField } from "@/components/ui/FormField";
import type { searchPatients } from "@/backend/reads";

export function PatientPicker({ patients, q, path = "/secretary/new-booking" }: {
  patients: Awaited<ReturnType<typeof searchPatients>>;
  q: string;
  path?: "/secretary/new-booking" | "/secretary/patients" | "/doctor/patients";
}) {
  const { items, page, pageSize, total } = patients;
  const searchHref = (number: number) => `${path}?${new URLSearchParams({ q, page: String(number) })}`;

  return (
    <section className="workspace-panel">
      <h2>اختيار مريض</h2>
      <form action={path} className="form-columns">
        <FormField label="الاسم أو رقم الموبايل" name="q" defaultValue={q} maxLength={100} />
        <button type="submit" className="button button--secondary">بحث</button>
      </form>
      {items.length === 0 && <p>مفيش مرضى في نتائج البحث.</p>}
      {items.map((patient) => (
        <div className="queue-summary" key={patient.patientId}>
          <p><bdi>{patient.fullName}</bdi> · <bdi dir="ltr">{patient.phone}</bdi></p>
          <Link prefetch={false} data-patient-record={path === "/secretary/new-booking" ? undefined : ""}
            className="button button--secondary"
            href={`${path}?${new URLSearchParams({ patientId: patient.patientId, ...(q ? { q } : {}), page: String(page) })}`}>
            {path === "/secretary/new-booking" ? "اختيار" : "عرض"} <bdi>{patient.fullName}</bdi>
          </Link>
        </div>
      ))}
      {(page > 1 || total > pageSize) && <nav className="form-columns" aria-label="صفحات المرضى">
        {page > 1 && <Link href={searchHref(page - 1)}>الصفحة السابقة</Link>}
        {page * pageSize < total && <Link href={searchHref(page + 1)}>الصفحة التالية</Link>}
      </nav>}
    </section>
  );
}
