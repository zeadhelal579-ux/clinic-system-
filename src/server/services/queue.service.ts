// Build the daily appointment table and select the earliest waiting arrival.
import "server-only";
import { addClinicDays, clinicDateOf, clinicDayBounds, utcInstant } from "@/lib/time/clinic-time";
import { requireRole } from "../auth/require-role";
import { QUEUE_DATE_RANGE_DAYS } from "../config/constants";
import { AppError } from "../errors/app-error";
import { parseInput } from "../http/run-action";
import { listQueue } from "../repositories/appointments.repository";
import { toAppointment } from "../repositories/mappers";
import { getQueueSchema } from "../schemas/appointment.schemas";
import type { QueueItem } from "../types/shared";

export async function getQueue(raw: unknown = {}) {
  const { client } = await requireRole(["secretary", "doctor"]);
  const query = parseInput(getQueueSchema, raw);
  const now = new Date();
  const today = clinicDateOf(now);
  const date = query.date ?? today;
  if (date < addClinicDays(today, -QUEUE_DATE_RANGE_DAYS) || date > addClinicDays(today, QUEUE_DATE_RANGE_DAYS)) {
    throw new AppError("VALIDATION_FAILED", { fields: { date: "validation.date_range" } });
  }

  const rows = await listQueue(client, clinicDayBounds(date));
  const items: QueueItem[] = rows.map((row) => ({
    appointmentId: row.id, patientId: row.patient_id, patientName: row.patients.full_name,
    age: row.patients.age, slotStart: utcInstant(row.slot_start), visitType: row.visit_type, source: row.source,
    status: row.status, arrivedAt: row.arrived_at ? utcInstant(row.arrived_at) : null,
    isMissed: toAppointment(row, now).isMissed,
  }));
  const waiting = items.filter((item) => item.status === "arrived");
  const next = waiting.toSorted((left, right) => (left.arrivedAt ?? "").localeCompare(right.arrivedAt ?? "") ||
    left.slotStart.localeCompare(right.slotStart) || left.appointmentId.localeCompare(right.appointmentId))[0];
  return {
    date, items,
    counters: { total: items.length, arrived: waiting.length + items.filter((item) => item.status === "done").length, waiting: waiting.length },
    nextAppointmentId: next?.appointmentId ?? null,
  };
}
