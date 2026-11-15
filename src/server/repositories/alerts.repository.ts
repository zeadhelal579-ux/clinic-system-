// Load or update the alert row visible to the current account.
import "server-only";
import type { z } from "zod";
import type { ClinicClient } from "../supabase/server-client";
import { normalizeMedicalFields, type updatePatientAlertsSchema } from "../schemas/profile.schemas";
import { toMedicalAlerts, type AlertRow } from "./mappers";
import { optionalResult, requiredResult } from "./query-result";

const columns = "has_allergy, allergy_text, has_chronic_disease, chronic_disease_text, takes_chronic_meds, chronic_meds_text, updated_at, updated_by_role";

export async function getAlerts(client: ClinicClient, patientId: string) {
  const row = optionalResult(await client.from("patient_medical_alerts").select(columns).eq("patient_id", patientId)
    .maybeSingle<AlertRow>());
  return toMedicalAlerts(row);
}

export async function upsertAlerts(client: ClinicClient, input: z.infer<typeof updatePatientAlertsSchema>) {
  const values = normalizeMedicalFields(input);
  const update = () => client.from("patient_medical_alerts").update(values)
    .eq("patient_id", input.patientId).select(columns).maybeSingle<AlertRow>();
  // The row identifier is insert-only. PostgREST upsert includes it in the update.
  const existing = optionalResult(await update());
  if (existing) return toMedicalAlerts(existing);
  const inserted = await client.from("patient_medical_alerts").insert({ patient_id: input.patientId, ...values })
    .select(columns).single<AlertRow>();
  // A concurrent request can create the row after the first update found nothing.
  return toMedicalAlerts(requiredResult(inserted.error?.code === "23505" ? await update() : inserted));
}
