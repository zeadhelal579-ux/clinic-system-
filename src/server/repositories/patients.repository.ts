// Load basic patient information and perform the atomic profile write.
import "server-only";
import type { z } from "zod";
import { utcInstant } from "@/lib/time/clinic-time";
import type { ClinicClient } from "../supabase/server-client";
import { normalizeMedicalFields, type completeProfileSchema } from "../schemas/profile.schemas";
import type { createWalkInPatientSchema, searchPatientsSchema } from "../schemas/patient.schemas";
import { toPatientBasic, type PatientRow } from "./mappers";
import { optionalResult, requiredResult } from "./query-result";

const patientColumns = "id, full_name, age, phone, address";
type SearchRow = { patient_id: string; full_name: string; age: number; phone: string;
  last_visit_at: string | null; next_appointment_at: string | null };

export async function getPatientByUserId(client: ClinicClient, userId: string) {
  const patient = optionalResult(await client.from("patients").select(patientColumns)
    .eq("user_id", userId).maybeSingle<PatientRow>());
  return patient ? toPatientBasic(patient) : null;
}

export async function getPatientById(client: ClinicClient, patientId: string) {
  const patient = optionalResult(await client.from("patients").select(patientColumns).eq("id", patientId)
    .maybeSingle<PatientRow>());
  return patient ? toPatientBasic(patient) : null;
}

export async function findPatientIdByPhone(client: ClinicClient, phone: string) {
  const patient = optionalResult(await client.from("patients").select("id").eq("phone", phone)
    .maybeSingle<{ id: string }>());
  return patient?.id;
}

export async function insertWalkInPatient(client: ClinicClient, profile: z.infer<typeof createWalkInPatientSchema>) {
  const row = requiredResult(await client.from("patients").insert({
    full_name: profile.fullName, age: profile.age, address: profile.address, phone: profile.phone, created_by_role: "secretary",
  }).select("id").single<{ id: string }>());
  return row.id;
}

export async function linkPatientForSession(client: ClinicClient) {
  optionalResult(await client.rpc("link_my_patient_file"));
}

export async function saveMyProfile(
  client: ClinicClient, profile: z.infer<typeof completeProfileSchema>, mode: "complete" | "update",
) {
  const alerts = normalizeMedicalFields(profile);
  const result = requiredResult(await client.rpc("complete_my_profile", {
    p_full_name: profile.fullName,
    p_age: profile.age,
    p_address: profile.address,
    p_has_allergy: alerts.has_allergy,
    p_allergy_text: alerts.allergy_text,
    p_has_chronic: alerts.has_chronic_disease,
    p_chronic_text: alerts.chronic_disease_text,
    p_takes_meds: alerts.takes_chronic_meds,
    p_meds_text: alerts.chronic_meds_text,
    p_require_existing: mode === "update",
  }));
  return result as string;
}

export async function findPatients(client: ClinicClient, input: z.infer<typeof searchPatientsSchema>) {
  const result = requiredResult(await client.rpc("search_patients", {
    p_q: input.q, p_page: input.page, p_page_size: input.pageSize, p_sort: input.sort,
  })) as { items: SearchRow[]; total: number };
  return {
    items: result.items.map((row) => ({
      patientId: row.patient_id,
      fullName: row.full_name,
      age: row.age,
      phone: row.phone,
      lastVisitAt: row.last_visit_at === null ? null : utcInstant(row.last_visit_at),
      nextAppointmentAt: row.next_appointment_at === null ? null : utcInstant(row.next_appointment_at),
    })),
    page: input.page,
    pageSize: input.pageSize,
    total: result.total,
  };
}
