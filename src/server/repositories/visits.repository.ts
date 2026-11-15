// Project signed visits, keeping the private note out of patient queries.
import "server-only";
import { utcInstant } from "@/lib/time/clinic-time";
import type { z } from "zod";
import { VISIT_HISTORY_LIMIT } from "../config/constants";
import type { endVisitSchema } from "../schemas/visit.schemas";
import type { DoctorVisitView, VisitType, VisitView } from "../types/shared";
import type { ClinicClient } from "../supabase/server-client";
import { optionalResult, requiredResult } from "./query-result";

type VisitRow = {
  appointment_id: string; diagnosis: string; instructions: string | null; follow_up_date: string | null;
  ended_at: string; appointments: { slot_start: string; visit_type: VisitType };
  prescriptions: { drug_name: string; dose: string; duration: string; position: number }[];
};
type DoctorVisitRow = VisitRow & { doctor_private_notes: { note: string } | null };
const visitProjection = "appointment_id, diagnosis, instructions, follow_up_date, ended_at, appointments!visits_appointment_patient_fk!inner(slot_start, visit_type), prescriptions(drug_name, dose, duration, position)";

export async function getPatientVisits(client: ClinicClient, patientId: string): Promise<VisitView[]> {
  const result = await visitsForPatient(client, patientId, visitProjection)
    .overrideTypes<VisitRow[], { merge: false }>();
  return requiredResult(result).map(toVisit);
}

export async function getDoctorVisits(client: ClinicClient, patientId: string): Promise<DoctorVisitView[]> {
  const result = await visitsForPatient(client, patientId, visitProjection + ", doctor_private_notes(note)")
    .overrideTypes<DoctorVisitRow[], { merge: false }>();
  return requiredResult(result).map((row) => ({ ...toVisit(row), privateNote: row.doctor_private_notes?.note ?? null }));
}

export async function finishVisit(client: ClinicClient, input: z.infer<typeof endVisitSchema>) {
  return requiredResult(await client.rpc("end_visit", {
    p_appointment_id: input.appointmentId,
    p_diagnosis: input.diagnosis,
    p_instructions: input.instructions || null,
    p_follow_up_date: input.followUpDate ?? null,
    p_prescriptions: input.prescriptions,
    p_private_note: input.privateNote || null,
  })) as { appointmentId: string; status: "done"; priceCharged: number };
}

export async function getMyFollowUpDate(client: ClinicClient) {
  return optionalResult(await client.rpc("get_my_follow_up_date")) as string | null;
}

function visitsForPatient(client: ClinicClient, patientId: string, projection: string) {
  return client.from("visits").select(projection).eq("patient_id", patientId)
    .order("ended_at", { ascending: false }).order("appointment_id").limit(VISIT_HISTORY_LIMIT);
}

function toVisit(row: VisitRow): VisitView {
  return {
    appointmentId: row.appointment_id,
    slotStart: utcInstant(row.appointments.slot_start),
    visitType: row.appointments.visit_type,
    diagnosis: row.diagnosis,
    instructions: row.instructions,
    followUpDate: row.follow_up_date,
    endedAt: utcInstant(row.ended_at),
    prescriptions: row.prescriptions.toSorted((left, right) => left.position - right.position).map(
      (item) => ({ drugName: item.drug_name, dose: item.dose, duration: item.duration }),
    ),
  };
}
