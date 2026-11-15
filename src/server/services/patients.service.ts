// Give staff scoped search, walk-in registration, and non-clinical summaries.
import "server-only";
import { requireRole } from "../auth/require-role";
import { PREVIOUS_APPOINTMENTS_LIMIT } from "../config/constants";
import { AppError } from "../errors/app-error";
import { parseInput } from "../http/run-action";
import { listByPatient } from "../repositories/appointments.repository";
import { findPatientIdByPhone, findPatients, getPatientById, insertWalkInPatient } from "../repositories/patients.repository";
import { createWalkInPatientSchema, searchPatientsSchema } from "../schemas/patient.schemas";
import { patientIdSchema } from "../schemas/common.schemas";

export async function searchPatients(raw: unknown) {
  const { client } = await requireRole(["secretary", "doctor"]);
  return findPatients(client, parseInput(searchPatientsSchema, raw));
}

export async function createWalkInPatient(raw: unknown) {
  const { client } = await requireRole(["secretary"]);
  const input = parseInput(createWalkInPatientSchema, raw);
  const id = await findPatientIdByPhone(client, input.phone);
  if (id) throw duplicatePhone(id);
  try {
    return { patientId: await insertWalkInPatient(client, input) };
  } catch (error) {
    if (error instanceof AppError && error.code === "PHONE_ALREADY_REGISTERED") {
      throw duplicatePhone(await findPatientIdByPhone(client, input.phone));
    }
    throw error;
  }
}

export async function getPatientSummary(raw: unknown) {
  const { client } = await requireRole(["secretary", "doctor"]);
  const { patientId } = parseInput(patientIdSchema, raw);
  const patient = await getPatientById(client, patientId);
  if (!patient) throw new AppError("NOT_FOUND");
  const { upcoming, past } = await listByPatient(client, patientId, new Date(), PREVIOUS_APPOINTMENTS_LIMIT);
  return { patient, nextAppointment: upcoming[0] ?? null, previousAppointments: past };
}

function duplicatePhone(patientId: string | undefined) {
  return new AppError("PHONE_ALREADY_REGISTERED", {
    details: patientId ? { existingPatientId: patientId } : undefined,
  });
}
