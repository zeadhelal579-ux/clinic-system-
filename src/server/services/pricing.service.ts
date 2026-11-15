// Restrict reading and changing the clinic's rates to the doctor.
import "server-only";
import { requireRole } from "../auth/require-role";
import { parseInput } from "../http/run-action";
import { readPrices, savePrices } from "../repositories/prices.repository";
import { updatePricesSchema } from "../schemas/settings.schemas";

export async function getPrices() {
  const { client } = await requireRole(["doctor"]);
  return readPrices(client);
}

export async function updatePrices(raw: unknown) {
  const { client } = await requireRole(["doctor"]);
  return savePrices(client, parseInput(updatePricesSchema, raw));
}
