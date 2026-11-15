// Drive the patient demo navigation, appointment flow, and fictional visit history.
import {
  clinicDays, clinicTimes, dayOffset, formatDay, formatTime, history,
  loadAppointment, sampleAppointment, saveAppointment, visitTypes,
} from "./demo-data.js";

const landing = document.querySelector("#landing");
const portal = document.querySelector("#portal");
const panels = [...document.querySelectorAll("[data-panel]")];
const links = [...document.querySelectorAll(".portal-nav a")];
const feedback = document.querySelector("#feedback");
const form = document.querySelector("#booking-form");
const typeField = document.querySelector("#visit-type");
const dayField = document.querySelector("#visit-date");
const timeField = document.querySelector("#visit-time");
const dialog = document.querySelector("#cancel-dialog");

let appointment = loadAppointment();
let notice = "";

function selectedPanel() {
  return panels.find(panel => "#" + panel.dataset.panel === location.hash);
}

function renderRoute(moveFocus) {
  const panel = selectedPanel();
  const inPortal = Boolean(panel);
  landing.hidden = inPortal;
  portal.hidden = !inPortal;
  document.querySelectorAll("[data-landing-only]").forEach(element => { element.hidden = inPortal; });
  document.querySelectorAll("[data-portal-only]").forEach(element => { element.hidden = !inPortal; });
  panels.forEach(item => { item.hidden = item !== panel; });
  links.forEach(link => {
    if (link.hash === location.hash) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (panel?.dataset.panel === "book") renderBookingForm();
  if (panel?.dataset.panel === "home") renderAppointment();
  feedback.textContent = notice;
  notice = "";

  if (!moveFocus || location.hash === "#features" || location.hash === "#main") return;
  const heading = panel?.querySelector("h2[tabindex]") ??
    document.querySelector(inPortal ? "#portal-title" : "#hero-title");
  heading.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function renderAppointment() {
  document.querySelector("#appointment-title").textContent =
    appointment ? visitTypes[appointment.type] + " في العيادة" : "مفيش موعد قادم";
  document.querySelector("#appointment-details").textContent =
    appointment ? formatDay(appointment.day) + " · " + formatTime(appointment.time) : "اختار يوم وميعاد يناسبوك من جدول الحجز.";
  document.querySelector("#appointment-actions").hidden = !appointment;
  document.querySelector("#new-appointment").hidden = Boolean(appointment);
}

function renderBookingForm() {
  document.querySelector("#booking-title").textContent = appointment ? "تعديل الموعد" : "حجز موعد";
  document.querySelector("#booking-context").textContent =
    appointment ? "اختار الميعاد الجديد. الموعد الحالي هيتغيّر بعد التأكيد." : "اختار من المواعيد المتاحة في عيادة الديمو.";
  document.querySelector("#confirm-booking").textContent = appointment ? "حفظ التعديل" : "تأكيد الحجز";
  const days = clinicDays();
  typeField.value = appointment?.type ?? "checkup";
  dayField.replaceChildren(...days.map(day => new Option(formatDay(day), day)));
  if (days.includes(appointment?.day)) dayField.value = appointment.day;
  renderTimes(appointment?.time);
}

function renderTimes(preferredTime) {
  const times = clinicTimes(dayField.value);
  timeField.replaceChildren(...times.map(time => new Option(formatTime(time), time)));
  if (times.includes(preferredTime)) timeField.value = preferredTime;
}

function commitAppointment(next, message) {
  appointment = next;
  const stored = saveAppointment(appointment);
  notice = stored ? message : message + " التغيير متاح لحد ما تقفل الصفحة.";
  if (location.hash === "#home") renderRoute(false);
  else location.hash = "home";
}

function renderHistory() {
  const dateLabel = visit => formatDay(dayOffset(-visit.daysAgo));
  const entries = history.map(visit => {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const note = document.createElement("p");
    summary.textContent = visit.title + " · " + dateLabel(visit);
    note.textContent = visit.summary;
    details.append(summary, note);
    return details;
  });
  document.querySelector("#visit-history").replaceChildren(...entries);
  document.querySelector("#latest-visit").textContent = history[0].title + " · " + dateLabel(history[0]);
}

window.addEventListener("hashchange", () => renderRoute(true));
dayField.addEventListener("change", () => renderTimes());
document.querySelector("#reschedule").addEventListener("click", () => { location.hash = "book"; });
document.querySelector("#cancel").addEventListener("click", () => {
  dialog.returnValue = "";
  dialog.showModal();
});
dialog.addEventListener("close", () => {
  if (dialog.returnValue === "cancel") {
    commitAppointment(null, "تم إلغاء الموعد التجريبي.");
    document.querySelector("#new-appointment").focus();
  }
});
document.querySelector("#reset").addEventListener("click", () => {
  commitAppointment(sampleAppointment(), "رجّعنا بيانات الديمو الأصلية.");
});
form.addEventListener("submit", event => {
  event.preventDefault();
  const scheduled = { type: typeField.value, day: dayField.value, time: timeField.value };
  if (!Object.hasOwn(visitTypes, scheduled.type) || !clinicDays().includes(scheduled.day) ||
      !clinicTimes(scheduled.day).includes(scheduled.time)) {
    feedback.textContent = "الميعاد ده مش متاح. اختار ميعاد تاني.";
    renderBookingForm();
    return;
  }
  commitAppointment(scheduled, appointment ? "تم تعديل الموعد التجريبي." : "تم تأكيد الحجز التجريبي.");
});

renderHistory();
renderRoute(false);

