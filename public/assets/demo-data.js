// Keep demo appointments, patient records, schedule and accounting in one local store.
const zone = "Africa/Cairo";
const isoDay = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
const dayLabel = new Intl.DateTimeFormat("ar-EG", { timeZone: zone, weekday: "long", day: "numeric", month: "long" });
const timeLabel = new Intl.DateTimeFormat("ar-EG", { timeZone: "UTC", hour: "numeric", minute: "numeric" });
const currency = new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 2 });
const storageKey = "clinic-demo-v2";
export const patientId = "salma";
export const visitTypes = { checkup: "كشف جديد", followup: "متابعة" };
export const statuses = { booked: "محجوز", arrived: "وصل", done: "تم", cancelled: "ملغي" };
export const weekdays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const dateObject = day => new Date(day + "T12:00:00Z");
export const formatDay = day => dayLabel.format(dateObject(day));
export const formatTime = time => timeLabel.format(new Date(`2000-01-01T${time}:00Z`));
export const formatMoney = amount => currency.format(amount);
export function dayOffset(offset = 0) {
  const date = dateObject(isoDay.format(new Date()));
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function seed() {
  const people = [
    ["salma", "سلمى حسن", 29, "01000000014", "المعادي", "لا توجد حساسية مسجلة", "لا توجد أمراض مزمنة مسجلة"],
    ["omar", "عمر ناصر", 42, "01000000021", "مدينة نصر", "حساسية مسجّلة من البنسلين", "ارتفاع ضغط الدم"],
    ["mariam", "مريم عادل", 34, "01000000032", "التجمع", "", ""],
    ["karim", "كريم يوسف", 37, "01000000047", "مصر الجديدة", "", ""],
    ["nour", "نور إبراهيم", 26, "01000000052", "المقطم", "", ""],
  ].map(([id, name, age, phone, address, allergies, chronic]) => ({ id, name, age, phone, address, allergies, chronic, currentMeds: id === "omar" ? "دواء ضغط مسجّل في الملف التجريبي" : "" }));
  const today = dayOffset();
  const state = {
    patients: people,
    appointments: [],
    visits: [],
    prices: { checkup: 450, followup: 250 },
    schedule: { minutes: 30, hours: weekdays.map((_, index) => ({ open: index !== 5 || dateObject(today).getUTCDay() === 5, start: "16:00", end: "20:00" })), holidays: [] },
  };
  const recent = [
    ["prior-salma", "salma", -7, "followup", 220], ["prior-salma-2", "salma", -27, "checkup", 400],
    ["prior-omar", "omar", -4, "checkup", 450], ["prior-mariam", "mariam", -2, "followup", 250],
    ["prior-karim", "karim", -1, "checkup", 450], ["today-nour", "nour", 0, "followup", 250],
  ];
  for (const [id, person, offset, type, charge] of recent) {
    state.appointments.push({ id, patientId: person, day: dayOffset(offset), time: "16:00", type, source: "clinic", status: "done" });
    state.visits.push({ appointmentId: id, patientId: person, day: dayOffset(offset), diagnosis: type === "followup" ? "زيارة متابعة دورية" : "كشف أول وتسجيل التاريخ الطبي", medications: [{ name: "دواء توضيحي", dose: "جرعة حسب الملف التجريبي", duration: "مدة تجريبية" }], instructions: "تم تسجيل تعليمات الزيارة التجريبية.", privateNote: "ملاحظة تجريبية خاصة بالدكتور.", followup: "", charge, type });
  }
  const appointments = [
    ["arrived-omar", "omar", 0, "16:30", "checkup", "clinic", "arrived", false],
    ["booked-salma", "salma", 0, "17:00", "followup", "online", "booked", true],
    ["booked-mariam", "mariam", 0, "17:30", "checkup", "clinic", "booked", false],
    ["booked-karim", "karim", dateObject(dayOffset(1)).getUTCDay() === 5 ? 2 : 1, "18:00", "checkup", "online", "booked", true],
  ];
  state.appointments.push(...appointments.map(([id, person, offset, time, type, source, status, unseen]) => ({
    id, patientId: person, day: dayOffset(offset), time, type, source, status, unseen,
    createdAt: Date.now() - (offset + 1) * 2_400_000,
    arrivedAt: status === "arrived" ? Date.now() - 600_000 : null,
  })));
  return state;
}

function load() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(stored?.patients) && Array.isArray(stored.appointments) && Array.isArray(stored.visits) &&
      Array.isArray(stored.schedule?.hours) && stored.prices) return stored;
  } catch {
    // Start from fixtures when storage is blocked or unreadable.
  }
  return seed();
}
export let clinic = load();
export function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(clinic)); return true; }
  catch { return false; }
}
export function reset() { clinic = seed(); return save(); }
export const person = id => clinic.patients.find(patient => patient.id === id);
export const appointment = id => clinic.appointments.find(item => item.id === id);
export const patientVisits = id => clinic.visits.filter(visit => visit.patientId === id).sort((a, b) => b.day.localeCompare(a.day));
export const isActive = item => ["booked", "arrived"].includes(item.status);
export const bySlot = (a, b) => (a.day + a.time).localeCompare(b.day + b.time);
export function patientAppointment() {
  return clinic.appointments.filter(item => item.patientId === patientId && isActive(item) && item.day >= dayOffset()).sort(bySlot)[0];
}
const minutesOf = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const timeOf = minutes => String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");

export function clinicDays() {
  return Array.from({ length: 28 }, (_, index) => dayOffset(index)).filter(day =>
    clinic.schedule.hours[dateObject(day).getUTCDay()].open && !clinic.schedule.holidays.includes(day));
}
export function slotsFor(day, editingId) {
  if (!clinicDays().includes(day)) return [];
  const { start, end } = clinic.schedule.hours[dateObject(day).getUTCDay()];
  const duration = clinic.schedule.minutes;
  const occupied = clinic.appointments.filter(item => item.day === day && item.status !== "cancelled" && item.id !== editingId);
  return Array.from({ length: Math.max(0, Math.floor((minutesOf(end) - minutesOf(start)) / duration)) }, (_, index) => {
    const startMinute = minutesOf(start) + index * duration;
    const available = !occupied.some(item => {
      const bookedMinute = minutesOf(item.time);
      return bookedMinute < startMinute + duration && bookedMinute + (item.duration ?? 30) > startMinute;
    });
    return { time: timeOf(startMinute), available };
  });
}

export function book(values, editingId) {
  const current = appointment(editingId);
  if ((editingId && current?.status !== "booked") || !person(values.patientId) || !Object.hasOwn(visitTypes, values.type) ||
    !slotsFor(values.day, editingId).some(slot => slot.available && slot.time === values.time)) return false;
  const details = { ...values, duration: clinic.schedule.minutes };
  if (current) Object.assign(current, details);
  else clinic.appointments.push({ ...details, id: crypto.randomUUID(), status: "booked", unseen: values.source === "online", createdAt: Date.now() });
  save();
  return true;
}

export function finishVisit(item, details) {
  if (item?.status !== "arrived" || !details.diagnosis || clinic.visits.some(visit => visit.appointmentId === item.id)) return false;
  const charge = clinic.prices[item.type];
  clinic.visits.push({ ...details, appointmentId: item.id, patientId: item.patientId, day: dayOffset(), type: item.type, charge });
  item.status = "done";
  save();
  return true;
}
