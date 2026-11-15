// Prevent a booking submission while the selected calendar day is changing.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { clinicDate } from "@/lib/format/format";
import type { VisitType } from "@/contracts/clinic";

export function DayStrip({ days, day, appointmentId, visitType, staff, children }: {
  days: string[];
  day: string;
  appointmentId?: string;
  visitType: VisitType;
  staff?: { patientId?: string; min: string; max: string };
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const path = staff ? "/secretary/new-booking" : "/patient/book";

  function hrefFor(date: string) {
    const query = new URLSearchParams({ date });
    if (appointmentId) query.set("appointmentId", appointmentId);
    if (staff?.patientId) query.set("patientId", staff.patientId);
    if (!staff && !appointmentId && visitType === "follow_up") query.set("type", visitType);
    return `${path}?${query}`;
  }

  return (
    <>
      {staff && <form className="workspace-panel form-columns" onSubmit={(event) => {
        event.preventDefault();
        const date = new FormData(event.currentTarget).get("date");
        if (typeof date === "string" && date !== day) startTransition(() => router.push(hrefFor(date)));
      }}>
        <label className="form-field">تاريخ الموعد
          <input key={day} name="date" type="date" min={staff.min} max={staff.max} defaultValue={day} required />
        </label>
        <button type="submit" className="button button--secondary" disabled={isPending}>عرض المواعيد</button>
      </form>}
      {days.length > 0 && <nav className="booking-days" aria-label="يوم الحجز">
        {days.map((date) => {
          const href = hrefFor(date);
          return (
            <Link key={date} href={href} prefetch={false}
              aria-current={date === day ? "date" : undefined} className="button button--secondary"
              onNavigate={(event) => {
                event.preventDefault();
                if (date !== day) startTransition(() => router.push(href));
              }}>
              <time dateTime={date}>{clinicDate.format(new Date(date))}</time>
            </Link>
          );
        })}
      </nav>}
      <div aria-busy={isPending}>
        {isPending && <p role="status" className="muted">جاري تحميل مواعيد اليوم المختار…</p>}
        <div inert={isPending} hidden={isPending}>{children}</div>
      </div>
    </>
  );
}
