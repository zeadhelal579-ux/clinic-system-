// Return the database's capacity view without patient or appointment identifiers.
import "server-only";
import { requireRole } from "../auth/require-role";
import { parseInput } from "../http/run-action";
import { getAvailableSlots } from "../repositories/appointments.repository";
import { getSlotsSchema } from "../schemas/appointment.schemas";

export async function getSlots(raw: unknown) {
  const { client } = await requireRole(["patient", "secretary", "doctor"]);
  const { date } = parseInput(getSlotsSchema, raw);
  return getAvailableSlots(client, date);
}
