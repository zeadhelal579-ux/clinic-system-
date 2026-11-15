// Orchestrate ownership, booking changes, and the online queue counters.
import "server-only";
import { addClinicDays, clinicDateOf, clinicDayBounds, utcInstant } from "@/lib/time/clinic-time";
import { requireRole } from "../auth/require-role";
import { PREVIOUS_APPOINTMENTS_LIMIT } from "../config/constants";
import { AppError } from "../errors/app-error";
import { parseInput } from "../http/run-action";
import { getPatientById, getPatientByUserId } from "../repositories/patients.repository";
import {
  countUnseenOnline, findOnlineBookings, getAppointmentById, getAvailableSlots, insertAppointment,
  listByPatient, markSeen, setArrived, setCancelled, updateSlot,
} from "../repositories/appointments.repository";
import { isProfileComplete, toAppointment } from "../repositories/mappers";
import { getAlerts } from "../repositories/alerts.repository";
import {
  createAppointmentSchema, listOnlineBookingsSchema, markOnlineBookingsSeenSchema, rescheduleAppointmentSchema,
} from "../schemas/appointment.schemas";
import { appointmentIdSchema } from "../schemas/common.schemas";
import type { ClinicClient } from "../supabase/server-client";

export async function createAppointment(raw: unknown) {
  const { client, role, userId } = await requireRole(["patient", "secretary"]);
  const input = parseInput(createAppointmentSchema, raw);
  if (role === "patient" && input.patientId !== undefined) throw new AppError("FORBIDDEN");
  if (role === "secretary" && !input.patientId) {
    throw new AppError("VALIDATION_FAILED", { fields: { patientId: "validation.required" } });
  }
  const patient = input.patientId ? await getPatientById(client, input.patientId) : await getPatientByUserId(client, userId);
  if (role === "patient" && (!patient || !isProfileComplete(patient, await getAlerts(client, patient.id)))) {
    throw new AppError("PROFILE_INCOMPLETE");
  }
  if (!patient) throw new AppError("NOT_FOUND");
  const slot = await assertSlotBookable(client, role, input.slotStart);
  const row = await insertAppointment(client, { patientId: patient.id, visitType: input.visitType, slot });
  return { appointment: toAppointment(row, new Date()) };
}

export async function rescheduleAppointment(raw: unknown) {
  const { client, role } = await requireRole(["patient", "secretary"]);
  const { appointmentId, newSlotStart } = parseInput(rescheduleAppointmentSchema, raw);
  const original = await requireBookedAppointment(client, appointmentId);
  if (role === "secretary" && original.source !== "online") throw new AppError("FORBIDDEN");
  if (utcInstant(original.slot_start) === utcInstant(newSlotStart)) {
    throw new AppError("VALIDATION_FAILED", { fields: { newSlotStart: "validation.same_slot" } });
  }
  const slot = await assertSlotBookable(client, role, newSlotStart);
  return transitionResult(await updateSlot(client, appointmentId, slot));
}

export async function cancelAppointment(raw: unknown) {
  const { client, role } = await requireRole(["patient", "secretary"]);
  const { appointmentId } = parseInput(appointmentIdSchema, raw);
  const original = await requireBookedAppointment(client, appointmentId);
  if (role === "secretary" && original.source !== "online") throw new AppError("FORBIDDEN");
  return transitionResult(await setCancelled(client, appointmentId));
}

export async function markArrived(raw: unknown) {
  const { client } = await requireRole(["secretary"]);
  const { appointmentId } = parseInput(appointmentIdSchema, raw);
  const appointment = await requireBookedAppointment(client, appointmentId);
  if (clinicDateOf(appointment.slot_start) !== clinicDateOf(new Date())) throw new AppError("INVALID_STATE_TRANSITION");
  return transitionResult(await setArrived(client, appointmentId));
}

export async function listMyAppointments() {
  const { client, userId } = await requireRole(["patient"]);
  const patient = await getPatientByUserId(client, userId);
  if (!patient) return { next: null, upcoming: [], past: [] };
  const { upcoming, past } = await listByPatient(client, patient.id, new Date(), PREVIOUS_APPOINTMENTS_LIMIT);
  return { next: upcoming[0] ?? null, upcoming: upcoming.slice(1), past };
}

export async function listOnlineBookings(raw: unknown = {}) {
  const { client } = await requireRole(["secretary"]);
  const pagination = parseInput(listOnlineBookingsSchema, raw);
  const now = new Date();
  return findOnlineBookings(client, { ...pagination, now, fromUtc: currentDayStart(now) });
}

export async function getOnlineBookingForEdit(raw: unknown) {
  const { client } = await requireRole(["secretary"]);
  const { appointmentId } = parseInput(appointmentIdSchema, raw);
  const row = await getAppointmentById(client, appointmentId);
  if (!row || row.source !== "online" || row.status !== "booked") throw new AppError("NOT_FOUND");
  return toAppointment(row, new Date());
}

export async function markOnlineBookingsSeen(raw: unknown) {
  const { client } = await requireRole(["secretary"]);
  const { appointmentIds } = parseInput(markOnlineBookingsSeenSchema, raw);
  return { updated: await markSeen(client, appointmentIds, currentDayStart(new Date())) };
}

export async function getUnseenOnlineCount() {
  const { client } = await requireRole(["secretary"]);
  return { count: await countUnseenOnline(client, currentDayStart(new Date())) };
}

async function requireBookedAppointment(client: ClinicClient, id: string) {
  const row = await getAppointmentById(client, id);
  if (!row) throw new AppError("NOT_FOUND");
  if (row.status !== "booked") throw new AppError("INVALID_STATE_TRANSITION");
  return row;
}

function transitionResult(row: Awaited<ReturnType<typeof updateSlot>>) {
  if (!row) throw new AppError("INVALID_STATE_TRANSITION");
  return { appointment: toAppointment(row, new Date()) };
}

async function assertSlotBookable(client: ClinicClient, role: "patient" | "secretary", instant: string) {
  const start = utcInstant(instant);
  const now = new Date();
  const day = clinicDateOf(start);
  const today = clinicDateOf(now);
  if (day < today || day > addClinicDays(today, role === "patient" ? 14 : 366)) {
    throw new AppError("SLOT_UNAVAILABLE");
  }
  const { slots } = await getAvailableSlots(client, day);
  const slot = slots.find((entry) => entry.start === start);
  if (!slot || (role === "patient" ? Date.parse(start) < now.getTime() : Date.parse(slot.end) <= now.getTime())) {
    throw new AppError("SLOT_UNAVAILABLE");
  }
  if (!slot.available) {
    throw new AppError("SLOT_TAKEN");
  }
  return slot;
}

function currentDayStart(now: Date) {
  return clinicDayBounds(clinicDateOf(now)).start;
}
