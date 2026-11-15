// Handle demo staff navigation and connect staff controls to the clinic store.
import { clinic, person, appointment, book, save, finishVisit, formatDay, dayOffset } from "./demo-data.js";
import {
  escapeHtml, queueView, onlineView, patientsView, patientRows, visitForm,
  medicationRow, slotOptions, bookingView, cashboxView, scheduleView,
} from "./staff-views.js";

const staff = document.querySelector("#staff");
const titles = {
  doctor: { queue: "الدور", patients: "ملفات المرضى", cashbox: "الخزنة", visit: "شاشة الكشف" },
  secretary: { queue: "طابور اليوم", online: "الحجوزات الأونلاين", patients: "المرضى", cashbox: "الخزنة", schedule: "المواعيد المتاحة", new: "حجز جديد", book: "تعديل حجز أونلاين" },
};
const nav = { doctor: ["queue", "patients", "cashbox"], secretary: ["queue", "online", "patients", "cashbox", "schedule"] };
let pendingNotice = "";
let role;

function route() {
  const [activeRole, section = "queue", id] = location.hash.slice(1).split("/");
  return Object.hasOwn(titles, activeRole) ? { role: activeRole, section, id } : null;
}

function content(route) {
  const { role: activeRole, section, id } = route;
  switch (section) {
    case "queue": return queueView(activeRole);
    case "online": return onlineView();
    case "patients": return patientsView(activeRole, person(id));
    case "cashbox": return cashboxView(activeRole);
    case "schedule": return scheduleView();
    case "new": return bookingView(person(id));
    case "book": {
      const item = appointment(id);
      return item?.status === "booked" && item.source === "online" ? bookingView(person(item.patientId), item) : "<p>الحجز غير متاح للتعديل.</p>";
    }
    case "visit": return visitForm(appointment(id));
    default: return queueView(activeRole);
  }
}

export function renderStaff(moveFocus = false) {
  const current = route();
  staff.hidden = !current;
  if (!current) return false;
  role = current.role;
  if (!Object.hasOwn(titles[role], current.section)) current.section = "queue";
  const secretary = role === "secretary";
  const newBookings = clinic.appointments.filter(item => item.source === "online" && item.unseen && item.status === "booked").length;
  const navLinks = nav[role].map(key => {
    const href = key === "queue" ? role : role + "/" + key;
    return `<a href="#${href}" ${key === current.section ? 'aria-current="page"' : ""}>
      ${titles[role][key]}${key === "online" && newBookings ? `<span class="nav-count">${newBookings}</span>` : ""}</a>`;
  }).join("");
  staff.innerHTML = `<div class="staff-layout"><aside class="staff-sidebar"><div class="staff-identity">
    <span class="avatar" aria-hidden="true">${secretary ? "هـ" : "م"}</span><div><strong>${secretary ? "هبة · السكرتيرة" : "د. مروان · الطبيب"}</strong><small>حساب تجريبي</small></div></div>
    ${secretary ? '<a class="button button-primary" href="#secretary/new">+ حجز جديد</a>' : ""}
    <nav class="portal-nav" aria-label="أقسام لوحة الإدارة">${navLinks}</nav>
    <nav class="role-links" aria-label="التبديل بين الحسابات">
    <a href="#${secretary ? "doctor" : "secretary"}">${secretary ? "لوحة الدكتور" : "لوحة السكرتيرة"}</a><a href="#home">حساب المريض</a></nav></aside>
    <div class="staff-content"><header class="staff-heading"><div><span class="eyebrow">${secretary ? "لوحة السكرتيرة" : "لوحة الدكتور"}</span>
    <h1 tabindex="-1">${titles[role][current.section]}</h1></div><time datetime="${dayOffset()}">${formatDay(dayOffset())}</time></header>
    <p class="feedback" role="status">${escapeHtml(pendingNotice)}</p>${content(current)}</div></div>`;
  pendingNotice = "";
  if (moveFocus) {
    staff.querySelector("h1").focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  return true;
}

function showNotice(message) {
  staff.querySelector('[role="status"]').textContent = message;
}
function refresh(message, destination) {
  pendingNotice = message;
  if (destination && location.hash !== "#" + destination) location.hash = destination;
  else renderStaff();
}
function stored(message, destination) {
  refresh(save() ? message : message + " التغيير موجود في الصفحة الحالية فقط.", destination);
}

staff.addEventListener("input", event => {
  const search = event.target.dataset.search;
  if (search) staff.querySelector("[data-results]").innerHTML = patientRows(role, event.target.value, search === "booking");
});
staff.addEventListener("change", event => {
  if (event.target.hasAttribute("data-slot-day")) {
    const form = event.target.form;
    form.elements.time.innerHTML = '<option value="">اختار ميعاد</option>' + slotOptions(event.target.value, form.dataset.id);
  }
});
staff.addEventListener("click", event => {
  const control = event.target.closest("[data-action]");
  if (!control) return;
  const { action, id } = control.dataset;
  const item = appointment(id);
  if (action === "med-add") {
    staff.querySelector("[data-med-list]").insertAdjacentHTML("beforeend", medicationRow());
    staff.querySelector(".med-row:last-child input").focus();
  }
  if (action === "med-remove") control.closest(".med-row").remove();
  if (role !== "secretary") return;
  if (action === "pick") location.hash = "secretary/new/" + encodeURIComponent(id);
  if (action === "seen") {
    for (const entry of clinic.appointments) if (entry.source === "online") entry.unseen = false;
    stored("تم تعليم الحجوزات كمقروءة.");
  }
  if (action === "arrive" && item?.status === "booked") {
    item.status = "arrived";
    item.unseen = false;
    item.arrivedAt = Date.now();
    stored("تم تسجيل وصول المريض. ظهر دلوقتي في دور الدكتور.");
  }
  if (action === "cancel" && item?.status === "booked" && confirm("تلغي الحجز التجريبي؟")) {
    item.status = "cancelled";
    stored("تم إلغاء الحجز.");
  }
  if (action === "holiday-remove") {
    clinic.schedule.holidays = clinic.schedule.holidays.filter(day => day !== id);
    stored("تم حذف الإجازة.");
  }
});

const textValue = (data, name) => String(data.get(name) ?? "").trim();
staff.addEventListener("submit", event => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const value = name => textValue(data, name);
  const id = form.dataset.id;
  switch (form.dataset.form) {
    case "new-patient": {
      if (role !== "secretary") return;
      const phone = value("phone").replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[\s-]/g, "");
      if (!/^\+?\d{8,15}$/.test(phone) || !value("name") || !value("address")) return showNotice("راجع البيانات ورقم التليفون التجريبي.");
      if (clinic.patients.some(patient => patient.phone === phone)) return showNotice("الرقم ده موجود. اختار المريض بعد البحث.");
      const patient = { id: crypto.randomUUID(), name: value("name"), age: Number(value("age")), phone, address: value("address"), allergies: "", chronic: "", currentMeds: "" };
      clinic.patients.push(patient);
      stored("تم تسجيل المريض. اختار ميعاد الحجز.", "secretary/new/" + patient.id);
      break;
    }
    case "booking": {
      if (role !== "secretary") return;
      const current = appointment(id);
      const values = { patientId: form.dataset.patient, type: value("type"), day: value("day"), time: value("time"), source: current?.source ?? "clinic" };
      if (!book(values, id)) return showNotice("الميعاد مش متاح. اختار وقت تاني.");
      refresh(id ? "تم تعديل الحجز." : "تم تسجيل الحجز.", id ? "secretary/online" : "secretary");
      break;
    }
    case "alerts": {
      if (role !== "doctor" || !person(id)) return;
      Object.assign(person(id), { allergies: value("allergies"), chronic: value("chronic"), currentMeds: value("currentMeds") });
      const saved = save();
      form.closest("details").previousElementSibling.querySelector("p").textContent =
        "الحساسية: " + (value("allergies") || "غير مسجّلة") + " · الأمراض المزمنة: " + (value("chronic") || "غير مسجّلة") + " · الأدوية الحالية: " + (value("currentMeds") || "غير مسجّلة");
      showNotice(saved ? "تم حفظ التنبيهات." : "تم تحديث التنبيهات للصفحة الحالية.");
      break;
    }
    case "visit": {
      if (role !== "doctor") return;
      const medications = [...form.querySelectorAll(".med-row")].map(row => ({
        name: row.querySelector('[name="medicine"]').value.trim(),
        dose: row.querySelector('[name="dose"]').value.trim(),
        duration: row.querySelector('[name="duration"]').value.trim(),
      })).filter(entry => entry.name);
      const details = { diagnosis: value("diagnosis"), medications, instructions: value("instructions"), privateNote: value("privateNote"), followup: value("followup") };
      if (!finishVisit(appointment(id), details)) return showNotice("راجع التشخيص وحالة الكشف.");
      refresh("تم إنهاء الكشف وحفظه في سجل المريض والخزنة.", "doctor");
      break;
    }
    case "prices":
      if (role !== "doctor") return;
      clinic.prices = { checkup: Number(value("checkup")), followup: Number(value("followup")) };
      stored("تم حفظ الأسعار للكشوفات القادمة.");
      break;
    case "schedule": {
      if (role !== "secretary") return;
      const hours = clinic.schedule.hours.map((_, index) => ({ open: data.has("open-" + index), start: value("start-" + index), end: value("end-" + index) }));
      if (hours.some(day => day.open && day.start >= day.end)) return showNotice("وقت نهاية العمل لازم يكون بعد البداية.");
      clinic.schedule.hours = hours;
      clinic.schedule.minutes = Number(value("minutes"));
      stored("تم تحديث الأيام والأوقات المتاحة للحجز.");
      break;
    }
    case "holiday":
      if (role !== "secretary") return;
      if (clinic.appointments.some(item => item.day === value("day") && ["booked", "arrived"].includes(item.status))) {
        return showNotice("اليوم فيه مواعيد قائمة. عدّل أو ألغِ الحجوزات أولاً.");
      }
      if (!clinic.schedule.holidays.includes(value("day"))) clinic.schedule.holidays.push(value("day"));
      clinic.schedule.holidays.sort();
      stored("تم حفظ الإجازة.");
  }
});
