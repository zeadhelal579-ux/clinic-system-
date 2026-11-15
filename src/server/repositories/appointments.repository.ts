// Persist scheduling transitions and query the appointment rows visible under RLS.
import "server-only";
import type { ClinicClient } from "../supabase/server-client";
import type { Slot, VisitType } from "../types/shared";
import { utcInstant } from "@/lib/time/clinic-time";
import { toAppointment, type AppointmentRow } from "./mappers";
import { optionalResult, requiredResult } from "./query-result";
import { mapDbError } from "../errors/map-db-error";

const columns = "id, patient_id, slot_start, slot_end, status, source, visit_type, arrived_at, secretary_seen_at, created_at";
type QueueRow = AppointmentRow & { patients: { full_name: string; age: number } };
type AppointmentInput = { patientId: string; visitType: VisitType; slot: Slot };

export async function getAvailableSlots(client: ClinicClient, date: string) {
  const result = requiredResult(await client.rpc("get_available_slots", { p_day: date })) as {
    date: string; open: boolean; slots: Slot[];
  };
  return {
    ...result,
    slots: result.slots.map((slot) => ({ ...slot, start: utcInstant(slot.start), end: utcInstant(slot.end) })),
  };
}

export async function getAppointmentById(client: ClinicClient, id: string) {
  return optionalResult(await client.from("appointments").select(columns).eq("id", id).maybeSingle<AppointmentRow>());
}

export async function insertAppointment(client: ClinicClient, input: AppointmentInput) {
  return requiredResult(await client.from("appointments").insert({
    patient_id: input.patientId,
    slot_start: input.slot.start,
    slot_end: input.slot.end,
    visit_type: input.visitType,
  }).select(columns).single<AppointmentRow>());
}

export async function updateSlot(client: ClinicClient, id: string, slot: Slot) {
  return updateBooked(client, id, { slot_start: slot.start, slot_end: slot.end });
}

export async function setCancelled(client: ClinicClient, id: string) {
  return updateBooked(client, id, { status: "cancelled" });
}

export async function setArrived(client: ClinicClient, id: string) {
  return updateBooked(client, id, { status: "arrived" });
}

function bookedOnline(client: ClinicClient, fromUtc: string) {
  return client.from("appointments")
    .select(columns + ", patients!inner(full_name, age)", { count: "exact" })
    .eq("source", "online").eq("status", "booked").gte("slot_start", fromUtc);
}

export async function findOnlineBookings(
  client: ClinicClient, options: { fromUtc: string; page: number; pageSize: number; now: Date },
) {
  const { page, pageSize, fromUtc, now } = options;
  const offset = (page - 1) * pageSize;
  const response = await bookedOnline(client, fromUtc).order("created_at", { ascending: false })
    .order("id").range(offset, offset + pageSize - 1).overrideTypes<QueueRow[], { merge: false }>();
  const rows = requiredResult(response);
  return {
    items: rows.map((row) => ({
      appointment: toAppointment(row, now),
      patientName: row.patients.full_name,
      age: row.patients.age,
      createdAt: utcInstant(row.created_at),
      isNew: row.secretary_seen_at === null,
    })),
    page, pageSize, total: response.count ?? 0,
  };
}

export async function markSeen(client: ClinicClient, ids: string[], fromUtc: string) {
  const response = await client.from("appointments").update({ secretary_seen_at: new Date().toISOString() })
    .in("id", ids).eq("source", "online").eq("status", "booked").gte("slot_start", fromUtc)
    .is("secretary_seen_at", null).select("id");
  return requiredResult(response).length;
}

export async function countUnseenOnline(client: ClinicClient, fromUtc: string) {
  const result = await client.from("appointments").select("id", { head: true, count: "exact" })
    .eq("source", "online").eq("status", "booked").gte("slot_start", fromUtc).is("secretary_seen_at", null);
  if (result.error) throw mapDbError(result.error);
  return result.count ?? 0;
}

export async function listByPatient(client: ClinicClient, patientId: string, now: Date, limit: number) {
  const nowInstant = now.toISOString();
  // Independent bounds keep historical rows from consuming the result limit for future appointments.
  const [active, historical] = await Promise.all([
    client.from("appointments").select(columns).eq("patient_id", patientId)
      .in("status", ["booked", "arrived"]).gt("slot_end", nowInstant)
      .order("slot_start").order("id").limit(limit).overrideTypes<AppointmentRow[], { merge: false }>(),
    client.from("appointments").select(columns).eq("patient_id", patientId)
      .or(`status.in.(done,cancelled),and(status.in.(booked,arrived),slot_end.lte."${nowInstant}")`)
      .order("slot_start", { ascending: false }).order("id").limit(limit)
      .overrideTypes<AppointmentRow[], { merge: false }>(),
  ]);
  return {
    upcoming: requiredResult(active).map((row) => toAppointment(row, now)),
    past: requiredResult(historical).map((row) => toAppointment(row, now)),
  };
}

export async function listQueue(client: ClinicClient, bounds: { start: string; end: string }) {
  const query = await client.from("appointments").select(columns + ", patients!inner(full_name, age)")
    .gte("slot_start", bounds.start).lt("slot_start", bounds.end).neq("status", "cancelled")
    .order("slot_start").order("id").overrideTypes<QueueRow[], { merge: false }>();
  return requiredResult(query);
}

async function updateBooked(
  client: ClinicClient, id: string, patch: { slot_start?: string; slot_end?: string; status?: "cancelled" | "arrived" },
) {
  return optionalResult(await client.from("appointments").update(patch).eq("id", id)
    .eq("status", "booked").select(columns).maybeSingle<AppointmentRow>());
}
