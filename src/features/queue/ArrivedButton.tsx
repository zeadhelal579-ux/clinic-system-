// Record a patient's arrival with the reception-only server action.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { markArrived } from "@/backend/commands";

export function ArrivedButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [hasArrived, setHasArrived] = useState(false);
  const { run, isPending, formError } = useActionMutation();

  async function arrive() {
    const result = await run(() => markArrived({ appointmentId }));
    if (result?.ok) {
      setHasArrived(true);
      router.refresh();
    }
  }

  return (
    <div>
      <Button variant="secondary" onClick={arrive} disabled={isPending || hasArrived}>
        {isPending ? "جاري التسجيل…" : hasArrived ? "تم التسجيل" : "وصل"}
      </Button>
      {formError && <small className="field-error" role="alert">{formError}</small>}
    </div>
  );
}
