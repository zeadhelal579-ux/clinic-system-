// Capture the current visit and submit a confirmed, atomic completion.
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { endVisit } from "@/backend/commands";

export function VisitForm({ appointmentId, minFollowUpDate }: { appointmentId: string; minFollowUpDate: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [rows, setRows] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const { run, isPending, fieldErrors, formError } = useActionMutation();

  useEffect(() => {
    if (!dirty) return;
    function preventLoss(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [dirty]);

  function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dialog.current?.showModal();
  }

  async function submit() {
    if (!form.current?.reportValidity()) return;
    const values = new FormData(form.current);
    const text = (field: string) => String(values.get(field) ?? "").trim();
    dialog.current?.close();
    const result = await run(() => endVisit({
      appointmentId, diagnosis: text("diagnosis"), instructions: text("instructions") || null,
      privateNote: text("privateNote") || null, followUpDate: text("followUpDate") || null,
      prescriptions: rows.map((id) => ({
        drugName: text(`drug-${id}`), dose: text(`dose-${id}`), duration: text(`duration-${id}`),
      })),
    }));
    if (result?.ok) {
      setDirty(false);
      router.replace("/doctor/queue");
      router.refresh();
    }
  }

  return (
    <section className="workspace-panel">
      <h2>تسجيل الكشف الحالي</h2>
      <form ref={form} aria-busy={isPending} onChange={() => setDirty(true)} onSubmit={confirm}>
        {(formError ?? Object.values(fieldErrors)[0]) &&
          <p role="alert" className="form-error">{formError ?? Object.values(fieldErrors)[0]}</p>}
        <fieldset className="form-stack" disabled={isPending}>
          <label className="form-field">التشخيص<textarea name="diagnosis" maxLength={2000} rows={3} required /></label>
          <label className="form-field">تعليمات للمريض<textarea name="instructions" maxLength={2000} rows={3} /></label>
          <h2>الأدوية</h2>
          {rows.map((id, index) => (
            <fieldset key={id} className="schedule-row">
              <legend>دواء {index + 1}</legend>
              <div className="form-columns">
                <FormField label="اسم الدواء" name={`drug-${id}`} maxLength={100} required />
                <FormField label="الجرعة" name={`dose-${id}`} maxLength={100} required />
                <FormField label="المدة" name={`duration-${id}`} maxLength={100} required />
              </div>
              <Button variant="text" onClick={() => setRows(rows.filter((row) => row !== id))}>حذف الدواء</Button>
            </fieldset>
          ))}
          <Button variant="secondary" disabled={rows.length === 20}
            onClick={() => setRows([...rows, crypto.randomUUID()])}>إضافة دواء</Button>
          <FormField label="موعد المتابعة" name="followUpDate" type="date" min={minFollowUpDate} />
          <label className="form-field">ملاحظة خاصة للدكتور<textarea name="privateNote" maxLength={5000} rows={3} /></label>
          <Button type="submit">{isPending ? "جاري إنهاء الكشف…" : "إنهاء الكشف"}</Button>
        </fieldset>
      </form>
      <dialog ref={dialog} className="auth-card" aria-labelledby="visit-confirm-title">
        <div className="form-stack">
          <h2 id="visit-confirm-title">تأكيد إنهاء الكشف</h2>
          <p>هيتحفظ الكشف ويتسجل في الخزنة.</p>
          <Button onClick={submit}>تأكيد الحفظ</Button>
          <Button variant="secondary" onClick={() => dialog.current?.close()}>الرجوع للتعديل</Button>
        </div>
      </dialog>
    </section>
  );
}
