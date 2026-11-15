// Save weekly working hours, visit length, and exceptional days off together.
"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { updateSchedule } from "@/backend/commands";
import type { getSchedule } from "@/backend/reads";

type Schedule = Awaited<ReturnType<typeof getSchedule>>;
const weekdays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export function ScheduleForm({ initial }: { initial: Schedule }) {
  const id = useId();
  const [slotMinutes, setSlotMinutes] = useState(String(initial.slotMinutes));
  const [hours, setHours] = useState(() => initial.workingHours.toSorted(
    (first, second) => (first.weekday + 1) % 7 - (second.weekday + 1) % 7,
  ));
  const [daysOff, setDaysOff] = useState(() => initial.daysOff.map((day) => ({ ...day, id: day.date })));
  const [saved, setSaved] = useState(false);
  const { run, isPending, formError, fieldErrors } = useActionMutation();

  function editHours(weekday: number, change: Partial<Schedule["workingHours"][number]>) {
    setHours((rows) => rows.map((row) => row.weekday === weekday ? { ...row, ...change } : row));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const result = await run(() => updateSchedule({
      slotMinutes: Number(slotMinutes),
      workingHours: hours,
      daysOff: daysOff.map(({ date, note }) => ({ date, note: note?.trim() || null })),
    }));
    if (result?.ok) setSaved(true);
  }

  return (
    <form className="workspace-panel" aria-busy={isPending} onSubmit={submit} onChange={() => setSaved(false)}>
      {formError && <p role="alert" className="form-error">{formError}</p>}
      <fieldset className="form-stack" disabled={isPending}>
        <FormField label="مدة الكشف بالدقايق" type="number" min={5} max={120} required
          name="slotMinutes" value={slotMinutes} onChange={(event) => setSlotMinutes(event.target.value)}
          error={fieldErrors.slotMinutes} />
        <h2>ساعات العمل</h2>
        {fieldErrors.workingHours && <p role="alert" className="field-error">{fieldErrors.workingHours}</p>}
        {hours.map((hour) => (
          <fieldset key={hour.weekday} className="schedule-row">
            <legend>{weekdays[hour.weekday]}</legend>
            <label htmlFor={`${id}-${hour.weekday}`}>
              <input id={`${id}-${hour.weekday}`} type="checkbox" checked={hour.isOpen}
                onChange={(event) => editHours(hour.weekday, { isOpen: event.target.checked })} /> يوم عمل
            </label>
            <div className="form-columns">
              <FormField label="من" type="time" dir="ltr" value={hour.startTime} disabled={!hour.isOpen} required
                onChange={(event) => editHours(hour.weekday, { startTime: event.target.value })} />
              <FormField label="إلى" type="time" dir="ltr" value={hour.endTime} disabled={!hour.isOpen} required
                onChange={(event) => editHours(hour.weekday, { endTime: event.target.value })} />
            </div>
          </fieldset>
        ))}
        <h2>الإجازات الاستثنائية</h2>
        {fieldErrors.daysOff && <p role="alert" className="field-error">{fieldErrors.daysOff}</p>}
        {daysOff.map((day, index) => (
          <fieldset className="schedule-row" key={day.id}>
            <legend>إجازة {index + 1}</legend>
            <FormField label="التاريخ" type="date" value={day.date} required
              error={fieldErrors[`daysOff.${index}.date`]}
              onChange={(event) => setDaysOff(daysOff.map((row) => row.id === day.id
                ? { ...row, date: event.target.value } : row))} />
            <FormField label="ملاحظة اختيارية" maxLength={200} value={day.note ?? ""}
              error={fieldErrors[`daysOff.${index}.note`]}
              onChange={(event) => setDaysOff(daysOff.map((row) => row.id === day.id
                ? { ...row, note: event.target.value } : row))} />
            <Button variant="text" onClick={() => { setSaved(false); setDaysOff(daysOff.filter((row) => row.id !== day.id)); }}>
              حذف الإجازة
            </Button>
          </fieldset>
        ))}
        <Button variant="secondary" disabled={daysOff.length === 366}
          onClick={() => { setSaved(false); setDaysOff([...daysOff, { id: crypto.randomUUID(), date: "", note: null }]); }}>
          إضافة إجازة
        </Button>
        <Button type="submit">{isPending ? "جاري الحفظ…" : "حفظ جدول العيادة"}</Button>
      </fieldset>
      {saved && <p role="status">تم حفظ جدول العيادة.</p>}
    </form>
  );
}
