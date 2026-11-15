// Format clinic dates and visit types consistently in Egyptian Arabic.
import { DEFAULT_LOCALE } from "@/i18n/config";
import { CLINIC_TIME_ZONE } from "@/lib/time/time-zone";
import type { AppointmentStatus, VisitType } from "@/contracts/clinic";

export const clinicDateTime = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  dateStyle: "long", timeStyle: "short", timeZone: CLINIC_TIME_ZONE,
});
export const clinicTime = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  timeStyle: "short", timeZone: CLINIC_TIME_ZONE,
});
export const clinicDate = new Intl.DateTimeFormat(DEFAULT_LOCALE, { dateStyle: "full", timeZone: "UTC" });

export const visitTypeLabel: Record<VisitType, string> = { new: "كشف", follow_up: "متابعة" };
export const appointmentStatusLabel: Record<AppointmentStatus, string> = {
  booked: "محجوز", arrived: "وصل", done: "تم الكشف", cancelled: "ملغي",
};
