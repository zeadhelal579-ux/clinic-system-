// Convert calendar dates and UTC boundaries in the clinic's time zone.
import { CLINIC_TIME_ZONE } from "./time-zone.ts";

const calendarFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLINIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayMs = 86_400_000;

export function clinicDateOf(instant: Date | string): string {
  const parts = calendarFormatter.formatToParts(typeof instant === "string" ? new Date(instant) : instant);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function addClinicDays(day: string, count: number): string {
  return new Date(Date.parse(day + "T00:00:00Z") + count * dayMs).toISOString().slice(0, 10);
}

function startOfClinicDay(day: string): string {
  const midnight = Date.parse(day + "T00:00:00Z");
  let low = midnight - dayMs;
  let high = midnight + dayMs;
  // A Cairo calendar day can start after a skipped wall-clock midnight.
  while (low < high) {
    const midpoint = Math.floor((low + high) / 2);
    if (clinicDateOf(new Date(midpoint)) < day) low = midpoint + 1;
    else high = midpoint;
  }
  return new Date(high).toISOString();
}

export function clinicDayBounds(day: string) {
  return { start: startOfClinicDay(day), end: startOfClinicDay(addClinicDays(day, 1)) };
}

export function utcInstant(value: string): string {
  return new Date(value).toISOString();
}
