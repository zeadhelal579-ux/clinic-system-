// Validate whole weekly schedules and prices before persistence.
import { z } from "zod";
import { dateSchema } from "./common.schemas";

const price = z.number().min(0).max(100_000).multipleOf(0.01);
export const updatePricesSchema = z.strictObject({ priceNew: price, priceFollowUp: price });

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const workingHourSchema = z.strictObject({
  weekday: z.number().int().min(0).max(6),
  isOpen: z.boolean(),
  startTime: timeSchema,
  endTime: timeSchema,
});
const dayOffSchema = z.strictObject({ date: dateSchema, note: z.string().trim().max(200).nullish() });

function toMinutes(time: string) {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}

export const updateScheduleSchema = z.strictObject({
  slotMinutes: z.number().int().min(5).max(120),
  workingHours: z.array(workingHourSchema).length(7),
  daysOff: z.array(dayOffSchema).max(366),
}).superRefine(({ slotMinutes, workingHours, daysOff }, context) => {
  if (new Set(workingHours.map((hour) => hour.weekday)).size !== workingHours.length ||
    workingHours.some((hour) => hour.isOpen && toMinutes(hour.endTime) - toMinutes(hour.startTime) < slotMinutes)) {
    context.addIssue({ code: "custom", path: ["workingHours"], message: "validation.hours_range_invalid" });
  }
  if (new Set(daysOff.map((day) => day.date)).size !== daysOff.length) {
    context.addIssue({ code: "custom", path: ["daysOff"], message: "validation.days_off_invalid" });
  }
});
