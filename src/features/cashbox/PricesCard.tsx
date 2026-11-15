// Let the doctor configure rates applied when future visits are completed.
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { updatePrices } from "@/backend/commands";

export function PricesCard({ priceNew, priceFollowUp }: { priceNew: number; priceFollowUp: number }) {
  const [saved, setSaved] = useState(false);
  const { run, formError, fieldErrors, isPending } = useActionMutation();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const data = new FormData(event.currentTarget);
    const result = await run(() => updatePrices({
      priceNew: Number(data.get("priceNew")), priceFollowUp: Number(data.get("priceFollowUp")),
    }));
    if (result?.ok) setSaved(true);
  }

  return (
    <form className="workspace-panel" onSubmit={save} onChange={() => setSaved(false)} aria-busy={isPending}>
      <h2>الأسعار للكشوف القادمة</h2>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <fieldset className="form-columns" disabled={isPending}>
        <FormField label="سعر الكشف بالجنيه" name="priceNew" type="number" min={0} max={100000} step="0.01"
          defaultValue={priceNew} error={fieldErrors.priceNew} required />
        <FormField label="سعر المتابعة بالجنيه" name="priceFollowUp" type="number" min={0} max={100000} step="0.01"
          defaultValue={priceFollowUp} error={fieldErrors.priceFollowUp} required />
      </fieldset>
      <Button type="submit" disabled={isPending}>{isPending ? "جاري الحفظ…" : "حفظ الأسعار"}</Button>
      {saved && <p role="status">تم حفظ الأسعار.</p>}
    </form>
  );
}
