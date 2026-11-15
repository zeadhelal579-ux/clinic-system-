// Submit a patient booking for a selected available time and visit type.
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { clinicTime, visitTypeLabel } from "@/lib/format/format";
import { createAppointment, rescheduleAppointment } from "@/backend/commands";
import type { Slot, VisitType } from "@/contracts/clinic";

const visitTypes: VisitType[] = ["new", "follow_up"];

export function BookingFlow({ slots, appointmentId, initialVisitType, patientId, returnTo = "/patient/home" }: {
  slots: Slot[];
  appointmentId?: string;
  initialVisitType: VisitType;
  patientId?: string;
  returnTo?: "/patient/home" | "/secretary/queue" | "/secretary/online";
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [visitType, setVisitType] = useState(initialVisitType);
  const { run, formError, fieldErrors, isPending } = useActionMutation();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slots.some((slot) => slot.start === selected)) return;
    const result = await run(() => appointmentId
      ? rescheduleAppointment({ appointmentId, newSlotStart: selected })
      : createAppointment({ slotStart: selected, visitType, ...(patientId ? { patientId } : {}) }));
    if (result?.ok) {
      router.replace(returnTo);
      router.refresh();
    }
    if (result?.ok === false && ["SLOT_TAKEN", "SLOT_UNAVAILABLE"].includes(result.error.code)) {
      setSelected("");
      router.refresh();
    }
  }

  const error = formError ?? Object.values(fieldErrors)[0];

  return (
    <form className="workspace-panel" onSubmit={submit} aria-busy={isPending}>
      {error && <p className="form-error" role="alert">{error}</p>}
      {appointmentId ? <p>نوع الزيارة · {visitTypeLabel[visitType]}</p> : <fieldset disabled={isPending}>
        <legend>نوع الزيارة</legend>
        <div className="choice-row">
          {visitTypes.map((type) => (
            <label key={type}>
              <input type="radio" name="visitType" checked={visitType === type} onChange={() => setVisitType(type)} />
              {visitTypeLabel[type]}
            </label>
          ))}
        </div>
      </fieldset>}
      <fieldset disabled={isPending}>
        <legend>المواعيد المتاحة</legend>
        <div className="choice-row slot-grid">
          {slots.map(({ start }) => (
            <label key={start}>
              <input type="radio" name="slotStart" checked={selected === start} onChange={() => setSelected(start)} />
              <time dateTime={start}>{clinicTime.format(new Date(start))}</time>
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" disabled={isPending || !slots.some((slot) => slot.start === selected)}>
        {isPending ? "جاري الحفظ…" : appointmentId ? "حفظ الموعد الجديد" : "تأكيد الحجز"}
      </Button>
    </form>
  );
}
