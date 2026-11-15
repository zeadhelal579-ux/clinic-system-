// Supply fictional patient data, a rolling slot calendar, and local appointment storage.
const zone = "Africa/Cairo";
const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
const dateFormatter = new Intl.DateTimeFormat("ar-EG", { timeZone: zone, weekday: "long", day: "numeric", month: "long" });
const timeFormatter = new Intl.DateTimeFormat("ar-EG", { timeZone: "UTC", hour: "numeric", minute: "numeric" });
const storageKey = "clinic-demo-appointment-v1";
const times = ["16:30", "17:00", "18:15", "19:00"];

export const visitTypes = { checkup: "كشف", followup: "متابعة" };
export const history = [
  { title: "متابعة دورية", daysAgo: 14, summary: "تمت مراجعة نتائج الزيارة السابقة وتوثيق موعد المتابعة." },
  { title: "كشف أول", daysAgo: 38, summary: "تم فتح ملف الزيارة وتسجيل ملاحظات الكشف التجريبية." },
];

export function dayOffset(offset = 0) {
  const today = new Date(dayFormatter.format(new Date()) + "T12:00:00Z");
  today.setUTCDate(today.getUTCDate() + offset);
  return today.toISOString().slice(0, 10);
}

export function formatDay(day) {
  return dateFormatter.format(new Date(day + "T12:00:00Z"));
}

export function formatTime(time) {
  return timeFormatter.format(new Date("2000-01-01T" + time + ":00Z"));
}

export function clinicDays() {
  return Array.from({ length: 12 }, (_, index) => dayOffset(index + 1))
    .filter(day => ![5, 6].includes(new Date(day + "T12:00:00Z").getUTCDay()));
}

export function clinicTimes(day) {
  const weekday = new Date(day + "T12:00:00Z").getUTCDay();
  return times.filter((_, index) => index !== weekday % times.length);
}

export function sampleAppointment() {
  const day = clinicDays()[1];
  return { type: "followup", day, time: clinicTimes(day)[1] };
}

function validStoredAppointment(value) {
  return value && Object.hasOwn(visitTypes, value.type) &&
    typeof value.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.day) &&
    new Date(value.day + "T12:00:00Z").toISOString().slice(0, 10) === value.day &&
    times.includes(value.time);
}

export function loadAppointment() {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === null) return sampleAppointment();
    const appointment = JSON.parse(stored);
    return validStoredAppointment(appointment) && appointment.day >= dayOffset() ? appointment : null;
  } catch {
    return sampleAppointment();
  }
}

export function saveAppointment(appointment) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(appointment));
    return true;
  } catch {
    return false;
  }
}

