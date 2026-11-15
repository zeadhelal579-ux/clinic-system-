// Read the schedule as a consistent snapshot and persist updates as one transaction.
import "server-only";
import type { z } from "zod";
import type { ClinicClient } from "../supabase/server-client";
import type { updateScheduleSchema } from "../schemas/settings.schemas";
import { requiredResult } from "./query-result";

type Schedule = z.infer<typeof updateScheduleSchema>;
type ScheduleRow = {
  slot_minutes: number;
  working_hours: { weekday: number; is_open: boolean; start_time: string; end_time: string }[];
  days_off: { day: string; note: string | null }[];
};

export async function readSchedule(client: ClinicClient) {
  const row = requiredResult(await client.rpc("get_schedule")) as ScheduleRow;
  return toSchedule(row);
}

function toSchedule(row: ScheduleRow) {
  return {
    slotMinutes: row.slot_minutes,
    workingHours: row.working_hours.map((hour) => ({
      weekday: hour.weekday, isOpen: hour.is_open, startTime: hour.start_time.slice(0, 5), endTime: hour.end_time.slice(0, 5),
    })),
    daysOff: row.days_off.map((day) => ({ date: day.day, note: day.note })),
  };
}

export async function saveSchedule(client: ClinicClient, schedule: Schedule) {
  const row = requiredResult(await client.rpc("update_schedule", {
    p_slot_minutes: schedule.slotMinutes,
    p_working_hours: schedule.workingHours,
    p_days_off: schedule.daysOff,
  })) as ScheduleRow;
  return toSchedule(row);
}
