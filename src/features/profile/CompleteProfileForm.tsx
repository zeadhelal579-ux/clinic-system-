// Save patient details and conditional medical alerts through the onboarding action.
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { completeProfile, updateMyProfile } from "@/backend/commands";
import type { MedicalAlerts, PatientBasic } from "@/contracts/clinic";
import { MedicalAlertsFields } from "./MedicalAlertsFields";
import { readMedicalAlerts } from "./readMedicalAlerts";

export function CompleteProfileForm({ phone, patient, alerts, mode = "onboarding" }: {
  phone: string; patient: PatientBasic | null; alerts: MedicalAlerts; mode?: "onboarding" | "edit";
}) {
  const router = useRouter();
  const { run, isPending, formError, fieldErrors } = useActionMutation();
  const [status, setStatus] = useState<"initial" | "dirty" | "saved">("initial");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const action = mode === "edit" ? updateMyProfile : completeProfile;
    const result = await run(() => action({
      fullName: form.get("fullName"), age: Number(form.get("age")), address: form.get("address"),
      ...readMedicalAlerts(form),
    }));
    if (!result?.ok) return;
    if (mode === "onboarding") router.replace("/patient/home");
    else {
      setStatus("saved");
      router.refresh();
    }
  }

  return (
    <form className="workspace-panel" onSubmit={submit} onChange={() => setStatus("dirty")} aria-busy={isPending}>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      {status === "saved" && <p role="status">تم حفظ التعديلات.</p>}
      <fieldset className="form-stack" disabled={isPending}>
        <FormField label="رقم الموبايل المؤكّد" dir="ltr" value={phone} readOnly />
        <FormField label="الاسم بالكامل" name="fullName" autoComplete="name" minLength={2} maxLength={100}
          required defaultValue={patient?.fullName} error={fieldErrors.fullName} />
        <FormField label="العمر بالسنين" name="age" type="number" inputMode="numeric" min={0} max={120} step={1}
          required defaultValue={patient?.age} error={fieldErrors.age} />
        <FormField label="العنوان" name="address" autoComplete="street-address" minLength={3} maxLength={300}
          required defaultValue={patient?.address} error={fieldErrors.address} />
        <MedicalAlertsFields alerts={alerts} errors={fieldErrors} />
        <Button type="submit" disabled={mode === "edit" && status !== "dirty"}>
          {isPending ? "جاري الحفظ…" : mode === "edit" ? "حفظ التعديلات" : "حفظ البيانات"}
        </Button>
      </fieldset>
    </form>
  );
}
