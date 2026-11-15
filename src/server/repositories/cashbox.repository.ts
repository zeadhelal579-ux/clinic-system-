// Map SQL-calculated cashbox aggregates to the application contracts.
import "server-only";
import type { ClinicClient } from "../supabase/server-client";
import { AppError } from "../errors/app-error";
import { toRevenue } from "./mappers";
import { requiredResult } from "./query-result";

type RevenueRow = Parameters<typeof toRevenue>[0];
type Period = "today" | "week" | "month";
type CashboxDay = RevenueRow & { day: string; weekday: number; is_day_off: boolean };

export async function getCashboxTotals(client: ClinicClient) {
  const rows = requiredResult(await client.rpc("cashbox_summary")) as (RevenueRow & { period: Period })[];
  const today = rows.find((row) => row.period === "today");
  const week = rows.find((row) => row.period === "week");
  const month = rows.find((row) => row.period === "month");
  if (!today || !week || !month) throw new AppError("INTERNAL");
  return { today: toRevenue(today), week: toRevenue(week), month: toRevenue(month) };
}

export async function getCashboxDays(client: ClinicClient) {
  const rows = requiredResult(await client.rpc("cashbox_last_7_days")) as CashboxDay[];
  return rows.toSorted((first, second) => first.day.localeCompare(second.day)).map((row) => ({
    date: row.day, weekday: row.weekday, isDayOff: row.is_day_off, ...toRevenue(row),
  }));
}
