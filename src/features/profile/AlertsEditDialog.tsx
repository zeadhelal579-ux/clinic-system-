// Show medical alerts and allow doctors to save changes through the role-checked action.
"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { updatePatientAlerts } from "@/backend/commands";
import type { MedicalAlerts } from "@/contracts/clinic";
import { MedicalAlertsFields } from "./MedicalAlertsFields";
import { readMedicalAlerts } from "./readMedicalAlerts";

export function AlertsEditDialog({ patientId, alerts }: { patientId: string; alerts: MedicalAlerts }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const { run, isPending, formError, fieldErrors } = useActionMutation();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = readMedicalAlerts(new FormData(event.currentTarget));
    const result = await run(() => updatePatientAlerts({ patientId, ...data }));
    if (result?.ok) {
      dialog.current?.close();
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="form-stack">
      <h2>التنبيهات الطبية</h2>
      <p className={alerts.hasAllergy ? "field-error" : undefined}>الحساسية · {answer(alerts.hasAllergy, alerts.allergyText)}</p>
      <p>الأمراض المزمنة · {answer(alerts.hasChronicDisease, alerts.chronicDiseaseText)}</p>
      {alerts.hasChronicDisease && <p>أدوية المرض المزمن · {answer(alerts.takesChronicMeds, alerts.chronicMedsText)}</p>}
      <Button variant="secondary" onClick={() => {
        setSaved(false);
        setOpen(true);
        dialog.current?.showModal();
      }}>تعديل التنبيهات الطبية</Button>
      {saved && <p role="status">تم تحديث التنبيهات الطبية.</p>}
      <dialog ref={dialog} className="auth-card" aria-label="تعديل التنبيهات الطبية"
        onClose={() => setOpen(false)} onCancel={(event) => { if (isPending) event.preventDefault(); }}>
        {open && <form className="form-stack" onSubmit={submit} aria-busy={isPending}>
          {(formError ?? Object.values(fieldErrors)[0]) &&
            <p role="alert" className="form-error">{formError ?? Object.values(fieldErrors)[0]}</p>}
          <fieldset className="form-stack" disabled={isPending}>
            <MedicalAlertsFields alerts={alerts} errors={fieldErrors} />
            <Button type="submit">{isPending ? "جاري الحفظ…" : "حفظ التنبيهات الطبية"}</Button>
            <Button variant="secondary" onClick={() => dialog.current?.close()}>إغلاق</Button>
          </fieldset>
        </form>}
      </dialog>
    </div>
  );
}

function answer(value: boolean | null, detail: string | null): string {
  if (value === null) return "غير مسجّل";
  return value ? detail || "نعم" : "لا";
}
