// Read and update the current rates for future visits.
import "server-only";
import { utcInstant } from "@/lib/time/clinic-time";
import type { ClinicClient } from "../supabase/server-client";
import { requiredResult } from "./query-result";

const projection = "price_new, price_follow_up, updated_at";
type PriceRow = { price_new: number; price_follow_up: number; updated_at: string };

export async function readPrices(client: ClinicClient) {
  const row = requiredResult(await client.from("clinic_prices").select(projection).eq("id", 1).single<PriceRow>());
  return { priceNew: Number(row.price_new), priceFollowUp: Number(row.price_follow_up), updatedAt: utcInstant(row.updated_at) };
}

export async function savePrices(client: ClinicClient, rates: { priceNew: number; priceFollowUp: number }) {
  const row = requiredResult(await client.from("clinic_prices").update({
    price_new: rates.priceNew, price_follow_up: rates.priceFollowUp,
  }).eq("id", 1).select(projection).single<PriceRow>());
  return { priceNew: Number(row.price_new), priceFollowUp: Number(row.price_follow_up) };
}
