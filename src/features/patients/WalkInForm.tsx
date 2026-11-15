// Register an unlinked patient or reopen the matching patient by phone.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { createWalkInPatient } from "@/backend/commands";

export function WalkInForm() {
  const router = useRouter();
  const { run, formError, fieldErrors, isPending } = useActionMutation();
  const [existing, setExisting] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setExisting(undefined);
    const result = await run(() => createWalkInPatient({
      fullName: data.get("fullName"), phone: data.get("phone"), age: Number(data.get("age")),
      address: data.get("address"),
    }));
    if (result?.ok) router.push(`/secretary/new-booking?patientId=${result.data.patientId}`);
    if (result?.ok === false) setExisting(result.error.details?.existingPatientId);
  }

  return (
    <details className="workspace-panel">
      <summary>تسجيل مريض جديد</summary>
      <form onSubmit={submit} className="form-stack" aria-busy={isPending}>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        {existing && <Link href={`/secretary/new-booking?patientId=${existing}`}>اختيار المريض المسجّل</Link>}
        <fieldset className="form-stack" disabled={isPending}>
          <FormField label="الاسم بالكامل" name="fullName" required minLength={2} maxLength={100} error={fieldErrors.fullName} />
          <FormField label="رقم الموبايل" name="phone" type="tel" dir="ltr" required maxLength={32} error={fieldErrors.phone} />
          <FormField label="العمر" name="age" type="number" required min={0} max={120} error={fieldErrors.age} />
          <FormField label="العنوان" name="address" required minLength={3} maxLength={300} error={fieldErrors.address} />
          <Button type="submit">{isPending ? "جاري التسجيل…" : "تسجيل المريض واختيار موعد"}</Button>
        </fieldset>
      </form>
    </details>
  );
}
