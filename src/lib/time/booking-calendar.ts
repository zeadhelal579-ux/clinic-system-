// Apply the patient's booking horizon using the clinic clock.
import "server-only";
import { addClinicDays, clinicDateOf } from "./clinic-time";

const BOOKING_WINDOW_DAYS = 14;

export function getBookingCalendar() {
  const timestamp = Date.now();
  const today = clinicDateOf(new Date(timestamp));
  const days = Array.from({ length: BOOKING_WINDOW_DAYS + 1 }, (_, index) => addClinicDays(today, index));
  return { timestamp, today, lastDay: addClinicDays(today, BOOKING_WINDOW_DAYS), days };
}
