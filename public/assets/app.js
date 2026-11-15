// Connect the patient portal to the clinic's shared demo state and staff workspaces.
import {
  patientId, person, patientAppointment, patientVisits, visitTypes, formatDay,
  formatTime, clinicDays, slotsFor, book, save, reset, dayOffset,
} from "./demo-data.js";
import { renderStaff } from "./staff.js";
import { visitDetails } from "./staff-views.js";

const landing = document.querySelector("#landing");
const portal = document.querySelector("#portal");
const panels = [...portal.querySelectorAll("[data-panel]")];
const links = [...portal.querySelectorAll(".portal-nav a")];
const feedback = document.querySelector("#feedback");
const booking = document.querySelector("#booking-form");
const typeField = booking.elements.type;
const dayField = booking.elements.date;
const timeField = booking.elements.time;
const profile = document.querySelector("#profile-form");
const dialog = document.querySelector("#cancel-dialog");
let notice = "";

function show(message, destination = "home") {
  notice = message;
  if (location.hash === "#" + destination) renderRoute(false);
  else location.hash = destination;
}

function renderRoute(moveFocus) {
  const inStaff = renderStaff(moveFocus);
  const panel = panels.find(item => "#" + item.dataset.panel === location.hash);
  const inPortal = Boolean(panel);
  const inWorkspace = inStaff || inPortal;
  landing.hidden = inWorkspace;
  portal.hidden = !inPortal;
  document.querySelectorAll("[data-landing-only]").forEach(element => { element.hidden = inWorkspace; });
  document.querySelectorAll("[data-portal-only]").forEach(element => { element.hidden = !inWorkspace; });
  if (inStaff) return;

  panels.forEach(item => { item.hidden = item !== panel; });
  links.forEach(link => {
    if (link.hash === location.hash) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (inPortal) renderPatient();
  if (panel?.dataset.panel === "book") renderBooking();
  if (panel?.dataset.panel === "profile") fillProfile();
  feedback.textContent = notice;
  notice = "";

  if (!moveFocus || location.hash === "#features" || location.hash === "#main") return;
  const heading = panel?.querySelector("h2[tabindex]") ??
    document.querySelector(inPortal ? "#portal-title" : "#hero-title");
  heading.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function renderPatient() {
  const patient = person(patientId);
  const visits = patientVisits(patientId);
  const next = patientAppointment();
  const canChange = next?.status === "booked";
  document.querySelector("#portal-title").textContent = "أهلًا يا " + patient.name.split(" ")[0];
  portal.querySelector(".profile-row strong").textContent = patient.name;
  document.querySelector("#appointment-title").textContent = next ? visitTypes[next.type] + " في العيادة" : "مفيش موعد قادم";
  document.querySelector("#appointment-details").textContent = next
    ? formatDay(next.day) + " · " + formatTime(next.time) + (next.status === "arrived" ? " · تم تسجيل وصولك" : "")
    : "اختار يوم وميعاد يناسبوك من جدول الحجز.";
  document.querySelector("#appointment-actions").hidden = !canChange;
  document.querySelector("#new-appointment").hidden = Boolean(next);
  document.querySelector("#visit-history").innerHTML = visits.map(visit => visitDetails(visit)).join("");
  document.querySelector("#latest-visit").textContent = visits[0] ? visits[0].diagnosis + " · " + formatDay(visits[0].day) : "مفيش زيارات مسجّلة";
  const followup = visits[0]?.followup;
  const banner = document.querySelector("#patient-followup");
  banner.textContent = followup >= dayOffset() ? "موعد المتابعة المقترح: " + formatDay(followup) : "";
}

function renderBooking() {
  const current = patientAppointment();
  const days = clinicDays();
  const locked = current?.status === "arrived";
  booking.hidden = locked || !days.length;
  document.querySelector("#booking-title").textContent = current && !locked ? "تعديل الموعد" : "حجز موعد";
  document.querySelector("#booking-context").textContent = locked
    ? "تم تسجيل وصولك للموعد. راجع الاستقبال لو محتاج تعدّل الحجز."
    : days.length ? "اختار من مواعيد العيادة. المواعيد المحجوزة بتظهر مقفولة." : "مفيش أيام عمل متاحة حاليًا.";
  document.querySelector("#confirm-booking").textContent = current ? "حفظ التعديل" : "تأكيد الحجز";
  if (booking.hidden) return;
  typeField.value = current?.type ?? "checkup";
  dayField.replaceChildren(...days.map(day => new Option(formatDay(day), day)));
  if (days.includes(current?.day)) dayField.value = current.day;
  renderTimes(current?.time);
}

function renderTimes(preferred) {
  const slots = slotsFor(dayField.value, patientAppointment()?.id);
  const options = slots.map(slot => {
    const option = new Option(formatTime(slot.time) + (slot.available ? "" : " · محجوز"), slot.time);
    option.disabled = !slot.available;
    return option;
  });
  timeField.replaceChildren(new Option("اختار ميعاد", ""), ...options);
  timeField.value = slots.some(slot => slot.time === preferred && slot.available) ? preferred : "";
}

function fillProfile() {
  const patient = person(patientId);
  for (const field of profile.elements) if (field.name) field.value = patient[field.name] ?? "";
}

window.addEventListener("hashchange", () => renderRoute(true));
dayField.addEventListener("change", () => renderTimes());
document.querySelector("#reschedule").addEventListener("click", () => { location.hash = "book"; });
document.querySelector("#cancel").addEventListener("click", () => {
  dialog.returnValue = "";
  dialog.showModal();
});
dialog.addEventListener("close", () => {
  const current = patientAppointment();
  if (dialog.returnValue === "cancel" && current?.status === "booked") {
    current.status = "cancelled";
    const saved = save();
    show(saved ? "تم إلغاء الموعد التجريبي." : "تم الإلغاء في الصفحة الحالية.");
    document.querySelector("#new-appointment").focus();
  }
});
document.querySelector("#reset").addEventListener("click", () => {
  if (confirm("ترجع بيانات العرض لكل الأدوار؟")) {
    const restored = reset();
    show(restored ? "رجعت بيانات العرض الأصلية." : "رجعت البيانات للصفحة الحالية.");
  }
});
booking.addEventListener("submit", event => {
  event.preventDefault();
  const current = patientAppointment();
  const details = { patientId, type: typeField.value, day: dayField.value, time: timeField.value, source: current?.source ?? "online" };
  if (!book(details, current?.id)) {
    feedback.textContent = "الميعاد ده مش متاح. اختار ميعاد تاني.";
    renderBooking();
    return;
  }
  show(current ? "تم تعديل الموعد التجريبي." : "تم تأكيد الحجز التجريبي.");
});
profile.addEventListener("submit", event => {
  event.preventDefault();
  const values = Object.fromEntries([...new FormData(profile)].map(([name, value]) => [name, value.trim()]));
  if (!values.name || !values.address) {
    feedback.textContent = "راجع الاسم والعنوان.";
    return;
  }
  Object.assign(person(patientId), values, { age: Number(values.age) });
  show(save() ? "تم حفظ بياناتك." : "تم تحديث البيانات في الصفحة الحالية.", "profile");
});

renderRoute(false);
