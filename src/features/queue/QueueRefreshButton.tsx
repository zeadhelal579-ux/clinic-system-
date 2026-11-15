// Refresh the current queue snapshot on request.
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";

export function QueueRefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button variant="secondary" disabled={isPending} onClick={() => startTransition(() => router.refresh())}>
      {isPending ? "جاري التحديث…" : "حدّث الطابور"}
    </Button>
  );
}
