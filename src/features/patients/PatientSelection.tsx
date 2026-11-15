// Disable the previous patient's details while another file is loading.
"use client";

import { useRouter } from "next/navigation";
import { useTransition, type MouseEvent, type ReactNode } from "react";

export function PatientSelection({ details, children }: { details: ReactNode; children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function select(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-patient-record]") : null;
    if (!link) return;
    event.preventDefault();
    startTransition(() => router.push(link.pathname + link.search));
  }

  return (
    <div className="form-stack" onClickCapture={select}>
      <div aria-busy={isPending}>
        {isPending && <p role="status" className="muted">جاري فتح ملف المريض…</p>}
        <div hidden={isPending} inert={isPending}>{details}</div>
      </div>
      {children}
    </div>
  );
}
