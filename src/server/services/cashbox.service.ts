// Expose audited revenue summaries to clinic staff.
import "server-only";
import { requireRole } from "../auth/require-role";
import { getCashboxDays, getCashboxTotals } from "../repositories/cashbox.repository";

export async function getCashboxSummary() {
  const { client } = await requireRole(["secretary", "doctor"]);
  return getCashboxTotals(client);
}

export async function getCashboxLast7Days() {
  const { client } = await requireRole(["secretary", "doctor"]);
  return { days: await getCashboxDays(client) };
}
