// Show a patient's appointment and its permitted management actions.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { appointmentStatusLabel, clinicDateTime, visitTypeLabel } from "@/lib/format/format";
import { cancelAppointment } from "@/backend/commands";
import type { Appointment } from "@/contracts/clinic";

export function UpcomingAppointmentCard({ appointment, editPath = "/patient/book" }: {
  appointment: Appointment;
  editPath?: "/patient/book" | "/secretary/new-booking";
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const { run, formError, isPending } = useActionMutation();

  async function cancel() {
    const result = await run(() => cancelAppointment({ appointmentId: appointment.id }));
    dialog.current?.close();
    if (result?.ok || result?.error.code === "INVALID_STATE_TRANSITION") router.refresh();
  }

  return (
    <div className="form-stack">
      <p><time dateTime={appointment.slotStart}>{clinicDateTime.format(new Date(appointment.slotStart))}</time> ·
        {" "}{visitTypeLabel[appointment.visitType]} · {appointmentStatusLabel[appointment.status]}</p>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      {appointment.status === "booked" && (
        <div className="form-columns">
          <Link prefetch={false} className="button button--secondary" href={`${editPath}?appointmentId=${appointment.id}`}>
            تعديل الموعد
          </Link>
          <Button variant="secondary" onClick={() => dialog.current?.showModal()}>إلغاء الموعد</Button>
        </div>
      )}
      <dialog ref={dialog} className="auth-card" aria-label="تأكيد إلغاء الموعد">
        <div className="form-stack">
          <h2>تأكيد إلغاء الموعد</h2>
          <p><time dateTime={appointment.slotStart}>{clinicDateTime.format(new Date(appointment.slotStart))}</time></p>
          <Button disabled={isPending} onClick={cancel}>تأكيد الإلغاء</Button>
          <Button variant="secondary" disabled={isPending} onClick={() => dialog.current?.close()}>الرجوع</Button>
        </div>
      </dialog>
    </div>
  );
}
