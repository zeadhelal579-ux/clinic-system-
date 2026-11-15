// Render the reception and doctor dashboards from the shared fictional clinic data.
import {
  clinic, dayOffset, dateObject, formatDay, formatTime, formatMoney, weekdays,
  visitTypes, statuses, person, patientVisits, isActive, bySlot, clinicDays, slotsFor,
} from "./demo-data.js";

export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const e = escapeHtml;
const noData = text => `<p class="blank">${text}</p>`;
const button = (action, id, label) => `<button type="button" class="button button-outline" data-action="${action}" data-id="${e(id)}">${label}</button>`;
const link = (url, label, primary = false) => `<a class="button button-${primary ? "primary" : "outline"}" href="#${url}">${label}</a>`;
const badge = item => `<span class="status-tag status-${e(item.status)}">${statuses[item.status]}</span>`;
const field = (label, name, value = "", attrs = "") => `<label>${label}<input name="${name}" value="${e(value)}" ${attrs}></label>`;
const area = (label, name, attrs = "") => `<label>${label}<textarea name="${name}" ${attrs}></textarea></label>`;
const today = () => dayOffset();

function table(headers, rows, empty = "مفيش بيانات للعرض.") {
  if (!rows.length) return noData(empty);
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="جدول البيانات"><table><thead><tr>${headers.map(header => `<th scope="col">${header}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function stats(cards) {
  return `<div class="stats">${cards.map(([label, value, note]) => `<article class="stat"><span>${label}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ""}</article>`).join("")}</div>`;
}

export function queueView(role) {
  const queue = clinic.appointments.filter(item => item.day === today() && item.status !== "cancelled").sort(bySlot);
  const next = queue.filter(item => item.status === "arrived").sort((a, b) => (a.arrivedAt ?? 0) - (b.arrivedAt ?? 0))[0];
  const waiting = queue.filter(item => item.status === "arrived").length;
  const booked = queue.filter(item => item.status === "booked").length;
  const doctor = role === "doctor";
  const nextPatient = next && person(next.patientId);
  return stats([["حجوزات اليوم", queue.length], ["وصلوا", queue.length - booked], ["في انتظار الكشف", waiting]]) +
    (doctor ? `<section class="panel next-patient"><div><span class="eyebrow">التالي في الدور</span><h2>${e(nextPatient?.name ?? "لا يوجد مريض منتظر")}</h2>
    ${next ? `<p>${nextPatient.age} سنة · ${visitTypes[next.type]} · موعد ${formatTime(next.time)}</p>` : ""}</div>
    ${next ? link("doctor/visit/" + encodeURIComponent(next.id), "ابدأ الكشف", true) : ""}</section>` : "") +
    `<section class="panel"><h2>مواعيد اليوم</h2>${table(
      ["الوقت", "المريض", "العمر", "نوع الزيارة", "المصدر", "الحالة", ...(!doctor ? ["الإجراء"] : [])],
      queue.map(item => {
        const patient = person(item.patientId);
        return [formatTime(item.time), e(patient.name), e(patient.age), visitTypes[item.type], item.source === "online" ? "أونلاين" : "من العيادة", badge(item),
          ...(!doctor ? [item.status === "booked" ? button("arrive", item.id, "تسجيل الوصول") : "—"] : [])];
      }))}</section>`;
}

export function onlineView() {
  const items = clinic.appointments.filter(item => item.source === "online" && item.status !== "cancelled").sort(bySlot);
  return `<section class="panel"><div class="section-heading"><h2>حجوزات الموقع</h2>${items.some(item => item.unseen && item.status === "booked") ? button("seen", "", "تعليم كمقروءة") : ""}</div>${table(
    ["المريض", "العمر", "نوع الزيارة", "الموعد", "وقت الحجز", "الحالة", "الإجراء"],
    items.map(item => [e(person(item.patientId).name) + (item.unseen && item.status === "booked" ? ' <span class="status-tag status-arrived">جديد</span>' : ""),
      e(person(item.patientId).age), visitTypes[item.type], formatDay(item.day) + " · " + formatTime(item.time),
      item.createdAt ? new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Cairo" }).format(item.createdAt) : "—",
      badge(item), item.status === "booked" ? `<div class="row-actions">${link("secretary/book/" + encodeURIComponent(item.id), "تعديل")}${button("cancel", item.id, "إلغاء")}</div>` : "—"])
  )}</section>`;
}

export function patientRows(role, query = "", booking = false) {
  const matches = clinic.patients.filter(patient => (patient.name + " " + patient.phone).includes(query.trim().toLowerCase()));
  return table(["المريض", "العمر", "التليفون", "آخر زيارة", "الموعد القادم", "الإجراء"], matches.map(patient => {
    const last = patientVisits(patient.id)[0];
    const next = clinic.appointments.filter(item => item.patientId === patient.id && isActive(item) && item.day >= today()).sort(bySlot)[0];
    return [e(patient.name), e(patient.age), `<bdi>${e(patient.phone)}</bdi>`, last ? formatDay(last.day) : "—",
      next ? formatDay(next.day) : "—", booking ? button("pick", patient.id, "اختيار") : link(role + "/patients/" + encodeURIComponent(patient.id), "فتح الملف")];
  }), "مفيش نتائج للبحث.");
}

export function visitDetails(visit, privateAccess = false) {
  return `<details class="record-entry"><summary>${formatDay(visit.day)} · ${visitTypes[visit.type]}</summary>
    <dl class="record-fields"><div><dt>التشخيص</dt><dd>${e(visit.diagnosis)}</dd></div>
    <div><dt>الأدوية</dt><dd>${visit.medications.map(med => e([med.name, med.dose, med.duration].filter(Boolean).join(" · "))).join("<br>") || "—"}</dd></div>
    <div><dt>التعليمات</dt><dd>${e(visit.instructions || "—")}</dd></div>
    ${visit.followup ? `<div><dt>المتابعة</dt><dd>${formatDay(visit.followup)}</dd></div>` : ""}
    ${privateAccess ? `<div><dt>ملاحظات خاصة بالدكتور</dt><dd>${e(visit.privateNote || "—")}</dd></div>` : ""}</dl></details>`;
}

function patientSummary(patient) {
  return `<div class="person-summary"><span class="avatar" aria-hidden="true">${e(patient.name[0])}</span><div><h2>${e(patient.name)}</h2><p>${e(patient.age)} سنة · <bdi>${e(patient.phone)}</bdi> · ${e(patient.address || "—")}</p></div></div>`;
}

function alerts(patient) {
  return `<div class="medical-alert"><strong>التنبيهات الطبية</strong><p>الحساسية: ${e(patient.allergies || "غير مسجّلة")} · الأمراض المزمنة: ${e(patient.chronic || "غير مسجّلة")} · الأدوية الحالية: ${e(patient.currentMeds || "غير مسجّلة")}</p></div>
  <details><summary>تعديل التنبيهات الطبية</summary><form data-form="alerts" data-id="${e(patient.id)}"><div class="form-grid">
  ${field("الحساسية", "allergies", patient.allergies, 'maxlength="120"')}${field("الأمراض المزمنة", "chronic", patient.chronic, 'maxlength="120"')}${field("الأدوية الحالية", "currentMeds", patient.currentMeds, 'maxlength="120"')}
  </div><button type="submit" class="button button-primary">حفظ التنبيهات</button></form></details>`;
}

export function patientsView(role, patient) {
  if (patient) {
    const doctor = role === "doctor";
    const current = clinic.appointments.find(item => item.patientId === patient.id && item.status === "arrived" && item.day === today());
    const items = clinic.appointments.filter(item => item.patientId === patient.id).sort(bySlot).reverse();
    const records = patientVisits(patient.id);
    const content = doctor ? `${alerts(patient)}<div class="section-heading"><h3>السجل الطبي</h3>${current ? link("doctor/visit/" + encodeURIComponent(current.id), "ابدأ الكشف", true) : ""}</div>
        ${records.map(item => visitDetails(item, true)).join("") || noData("مفيش زيارات مسجّلة.")}` :
      `${link("secretary/new/" + encodeURIComponent(patient.id), "حجز موعد لهذا المريض", true)}<h3>المواعيد السابقة والقادمة</h3>
        ${table(["اليوم", "الوقت", "النوع", "الحالة"], items.map(item => [formatDay(item.day), formatTime(item.time), visitTypes[item.type], badge(item)]))}`;
    return `<section class="panel staff-stack">${link(role + "/patients", "رجوع لقائمة المرضى")}${patientSummary(patient)}${content}</section>`;
  }
  return `<section class="panel"><label class="search-label">ابحث عن مريض بالاسم أو رقم التليفون<input type="search" data-search="patients" placeholder="مثال: سلمى" autocomplete="off"></label><div data-results>${patientRows(role)}</div></section>`;
}

export function visitForm(item) {
  if (!item || item.status !== "arrived") return noData("الكشف متاح للمرضى اللي تم تسجيل وصولهم.");
  const patient = person(item.patientId);
  const previous = patientVisits(patient.id);
  return `<section class="panel staff-stack">${patientSummary(patient)}<span class="status-tag status-arrived">${visitTypes[item.type]}</span>${alerts(patient)}</section>
  <div class="visit-grid"><section class="panel"><h2>الزيارة السابقة</h2>${previous.map(visit => visitDetails(visit, true)).join("") || noData("أول زيارة للمريض.")}</section>
  <section class="panel"><h2>الكشف الحالي</h2><form class="staff-stack" data-form="visit" data-id="${e(item.id)}">
  ${area("التشخيص", "diagnosis", 'required maxlength="400"')}
  <fieldset><legend>الأدوية</legend><div data-med-list>${medicationRow()}</div>${button("med-add", "", "إضافة دواء")}</fieldset>
  ${area("تعليمات للمريض", "instructions", 'maxlength="400"')}${area("ملاحظات خاصة بالدكتور", "privateNote", 'maxlength="400"')}
  ${field("موعد المتابعة (اختياري)", "followup", "", `type="date" min="${today()}"`)}
  <button class="button button-primary" type="submit">إنهاء الكشف</button></form></section></div>`;
}

export function medicationRow() {
  return `<div class="med-row">${field("اسم الدواء", "medicine", "", 'maxlength="80"')}${field("الجرعة", "dose", "", 'maxlength="80"')}${field("المدة", "duration", "", 'maxlength="80"')}${button("med-remove", "", "حذف")}</div>`;
}

export function slotOptions(day, id, selected) {
  return slotsFor(day, id).map(slot => `<option value="${slot.time}" ${!slot.available ? "disabled" : ""} ${slot.time === selected && slot.available ? "selected" : ""}>${formatTime(slot.time)}${slot.available ? "" : " · محجوز"}</option>`).join("");
}

export function bookingView(patient, item) {
  if (!patient) return `<section class="panel staff-stack"><h2>ابحث في المرضى المسجلين</h2>
  <label>الاسم أو رقم التليفون<input type="search" data-search="booking" autocomplete="off"></label><div data-results>${patientRows("secretary", "", true)}</div>
  <details><summary>تسجيل مريض جديد</summary><form data-form="new-patient"><div class="form-grid">
  ${field("الاسم بالكامل", "name", "", 'required maxlength="70"')}${field("العمر", "age", "", 'type="number" min="1" max="120" required')}
  ${field("رقم تليفون تجريبي", "phone", "", 'type="tel" inputmode="tel" maxlength="15" required')}${field("العنوان", "address", "", 'required maxlength="100"')}
  </div><button type="submit" class="button button-primary">تسجيل والانتقال للحجز</button></form></details></section>`;
  const days = clinicDays();
  const day = days.includes(item?.day) ? item.day : days[0];
  return `<section class="panel staff-stack">${patientSummary(patient)}${days.length ? `<form data-form="booking" data-id="${e(item?.id)}" data-patient="${e(patient.id)}"><div class="form-grid">
  <label>نوع الزيارة<select name="type">${Object.entries(visitTypes).map(([value, label]) => `<option value="${value}" ${item?.type === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
  <label>اليوم<select name="day" data-slot-day>${days.map(value => `<option value="${value}" ${value === day ? "selected" : ""}>${formatDay(value)}</option>`).join("")}</select></label>
  <label>الوقت<select name="time" required><option value="">اختار ميعاد</option>${slotOptions(day, item?.id, item?.time)}</select></label></div>
  <div class="actions"><button type="submit" class="button button-primary">${item ? "حفظ تعديل الحجز" : "تأكيد الحجز"}</button>${link(item ? "secretary/online" : "secretary", "رجوع")}</div></form>` : noData("لا توجد أيام عمل متاحة في الأسابيع القادمة.")}</section>`;
}

export function cashboxView(role) {
  const amounts = visits => [formatMoney(visits.reduce((sum, visit) => sum + visit.charge, 0)), `${visits.length} زيارة مكتملة`];
  const startOfWeek = dayOffset(-((dateObject(today()).getUTCDay() + 1) % 7));
  const relevant = (start, end) => clinic.visits.filter(visit => visit.day >= start && visit.day <= end);
  const rows = Array.from({ length: 7 }, (_, index) => {
    const day = dayOffset(-index);
    const visits = relevant(day, day);
    return [formatDay(day), visits.filter(visit => visit.type === "checkup").length,
      visits.filter(visit => visit.type === "followup").length, amounts(visits)[0],
      (!clinic.schedule.hours[dateObject(day).getUTCDay()].open || clinic.schedule.holidays.includes(day)) ? "إجازة" : "يوم عمل"];
  });
  return stats([["إيراد اليوم", ...amounts(relevant(today(), today()))], ["إيراد الأسبوع", ...amounts(relevant(startOfWeek, today()))],
    ["إيراد الشهر", ...amounts(relevant(today().slice(0, 7) + "-01", today()))]]) +
    `<section class="panel"><h2>آخر ٧ أيام</h2>${table(["التاريخ", "كشف جديد", "متابعة", "الإيراد", "اليوم"], rows)}</section>` +
    (role === "doctor" ? `<section class="panel"><h2>أسعار الكشف</h2><p>كل كشف مكتمل يحتفظ بالسعر اللي اتسجل وقت إنهائه.</p>
      <form data-form="prices"><div class="form-grid">${field("سعر الكشف الجديد", "checkup", clinic.prices.checkup, 'type="number" min="0" max="100000" step="1" required')}
      ${field("سعر المتابعة", "followup", clinic.prices.followup, 'type="number" min="0" max="100000" step="1" required')}</div>
      <button type="submit" class="button button-primary">حفظ الأسعار</button></form></section>` : "");
}

export function scheduleView() {
  const hours = clinic.schedule.hours.map((day, index) => `<div class="hours-row"><label class="check-label"><input type="checkbox" name="open-${index}" ${day.open ? "checked" : ""}> ${weekdays[index]}</label>
    ${field("من", "start-" + index, day.start, 'type="time" required')}${field("إلى", "end-" + index, day.end, 'type="time" required')}</div>`).join("");
  return `<section class="panel"><h2>أيام وساعات العمل</h2><form data-form="schedule" class="staff-stack">${hours}
  ${field("مدة الكشف بالدقائق", "minutes", clinic.schedule.minutes, 'type="number" min="5" max="120" required')}
  <button type="submit" class="button button-primary">حفظ المواعيد المتاحة</button></form></section>
  <section class="panel"><h2>أيام الإجازة</h2><form class="form-grid" data-form="holiday">${field("تاريخ الإجازة", "day", "", `type="date" min="${today()}" required`)}<button class="button button-outline" type="submit">إضافة إجازة</button></form>
  ${clinic.schedule.holidays.map(day => `<div class="hours-row"><span>${formatDay(day)}</span>${button("holiday-remove", day, "حذف الإجازة")}</div>`).join("") || noData("مفيش إجازات استثنائية مسجّلة.")}</section>`;
}
