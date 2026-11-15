// Authorize doctors to read clinical context and end visits.
import "server-only";
import { clinicDateOf } from "@/lib/time/clinic-time";
import { requireRole } from "../auth/require-role";
import { AppError } from "../errors/app-error";
import { parseInput } from "../http/run-action";
import { getAlerts, upsertAlerts } from "../repositories/alerts.repository";
import { getAppointmentById } from "../repositories/appointments.repository";
import { toAppointment } from "../repositories/mappers";
import { getPatientById } from "../repositories/patients.repository";
import { finishVisit, getDoctorVisits } from "../repositories/visits.repository";
import { appointmentIdSchema, patientIdSchema } from "../schemas/common.schemas";
import { updatePatientAlertsSchema } from "../schemas/profile.schemas";
import { endVisitSchema } from "../schemas/visit.schemas";
import type { ClinicClient } from "../supabase/server-client";

export async function getVisitContext(raw: unknown) {
  const { client } = await requireRole(["doctor"]);
  const { appointmentId } = parseInput(appointmentIdSchema, raw);
  const row = await getAppointmentById(client, appointmentId);
  if (!row) throw new AppError("NOT_FOUND");
  const file = await loadMedicalFile(client, row.patient_id);
  const prior = file.visits.filter((visit) => visit.appointmentId !== appointmentId);
  return {
    appointment: toAppointment(row, new Date()), patient: file.patient, alerts: file.alerts,
    lastVisit: prior[0] ?? null, olderVisits: prior.slice(1),
  };
}

export async function endVisit(raw: unknown) {
  const { client } = await requireRole(["doctor"]);
  const input = parseInput(endVisitSchema, raw);
  if (input.followUpDate && input.followUpDate <= clinicDateOf(new Date())) {
    throw new AppError("VALIDATION_FAILED", { fields: { followUpDate: "validation.follow_up_in_past" } });
  }
  return finishVisit(client, input);
}

export async function getPatientMedicalFile(raw: unknown) {
  const { client } = await requireRole(["doctor"]);
  const { patientId } = parseInput(patientIdSchema, raw);
  return loadMedicalFile(client, patientId);
}

export async function updatePatientAlerts(raw: unknown) {
  const { client } = await requireRole(["doctor"]);
  const input = parseInput(updatePatientAlertsSchema, raw);
  if (!await getPatientById(client, input.patientId)) throw new AppError("NOT_FOUND");
  return { alerts: await upsertAlerts(client, input) };
}

async function loadMedicalFile(client: ClinicClient, patientId: string) {
  const patient = await getPatientById(client, patientId);
  if (!patient) throw new AppError("NOT_FOUND");
  const [alerts, visits] = await Promise.all([getAlerts(client, patientId), getDoctorVisits(client, patientId)]);
  return { patient, alerts, visits };
}
