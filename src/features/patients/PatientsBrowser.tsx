// Search patients and hand the selected record to the role-specific view.
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { uuidSchema } from "@/contracts/input";
import { searchPatients } from "@/backend/reads";
import { PatientPicker } from "./PatientPicker";
import { PatientSelection } from "./PatientSelection";

export type PatientSearchParams = { q?: string | string[]; page?: string | string[]; patientId?: string | string[] };

export async function PatientsBrowser({ role, query, renderPatient }: {
  role: "secretary" | "doctor";
  query: PatientSearchParams;
  renderPatient: (patientId: string) => ReactNode;
}) {
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const page = typeof query.page === "string" && /^\d{1,6}$/.test(query.page) ? Math.max(1, Number(query.page)) : 1;
  const selected = uuidSchema.safeParse(query.patientId);
  if (query.patientId !== undefined && !selected.success) notFound();
  const patients = await searchPatients({ q, page });
  const path = `/${role}/patients` as const;
  return (
    <main className="workspace-content">
      <div className="screen-heading"><Link href={`/${role}/queue`}>الرجوع للطابور</Link><h1>المرضى</h1></div>
      <PatientSelection details={selected.success ? renderPatient(selected.data) : null}>
        <PatientPicker patients={patients} q={q} path={path} />
      </PatientSelection>
    </main>
  );
}
