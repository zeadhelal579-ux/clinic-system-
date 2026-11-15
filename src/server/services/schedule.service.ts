// Expose the weekly calendar and limit editing to the secretary.
import "server-only";
import { requireRole } from "../auth/require-role";
import { parseInput } from "../http/run-action";
import { readSchedule, saveSchedule } from "../repositories/schedule.repository";
import { updateScheduleSchema } from "../schemas/settings.schemas";

export async function getSchedule() {
  const { client } = await requireRole(["patient", "secretary", "doctor"]);
  return readSchedule(client);
}

export async function updateSchedule(raw: unknown) {
  const { client } = await requireRole(["secretary"]);
  return saveSchedule(client, parseInput(updateScheduleSchema, raw));
}
