// Render the role-specific queue from a server-authorized snapshot.
import { clinicDate } from "@/lib/format/format";
import Link from "next/link";
import type { getQueue } from "@/backend/reads";
import { QueueTable } from "./QueueTable";
import { QueueRefreshButton } from "./QueueRefreshButton";

type Props = { role: "secretary" | "doctor"; queue: Awaited<ReturnType<typeof getQueue>>; unseenOnline?: number };

export function QueueBoard({ queue, role, unseenOnline = 0 }: Props) {
  const next = role === "doctor" ? queue.items.find((item) => item.appointmentId === queue.nextAppointmentId) : undefined;
  const stats = [
    { label: "حجوزات اليوم", value: queue.counters.total },
    { label: "وصلوا", value: queue.counters.arrived },
    { label: "منتظرون", value: queue.counters.waiting },
  ];

  return (
    <main className="workspace-content">
      <div className="screen-heading">
        <h1>{role === "secretary" ? "طابور اليوم" : "الدور"}</h1>
        <p><time dateTime={queue.date}>{clinicDate.format(new Date(queue.date))}</time></p>
      </div>
      <section className="workspace-panel" aria-label="ملخص الطابور">
        <div className="queue-summary">
          <dl className="detail-list">
            {stats.map(({ label, value }) => (
              <div key={label}><dt>{label}</dt><dd>{value.toLocaleString("ar-EG")}</dd></div>
            ))}
          </dl>
          <QueueRefreshButton />
          <Link className="button button--secondary" href={`/${role}/cashbox`}>الخزنة</Link>
          <Link className="button button--secondary" href={`/${role}/patients`}>المرضى</Link>
          {role === "secretary" && <>
            <Link className="button button--primary" href="/secretary/new-booking">حجز جديد</Link>
            <Link prefetch={false} className="button button--secondary" href="/secretary/online">
              الحجوزات الأونلاين{unseenOnline > 0 && ` (${unseenOnline.toLocaleString("ar-EG")} جديد)`}
            </Link>
            <Link className="button button--secondary" href="/secretary/schedule">المواعيد المتاحة</Link>
          </>}
        </div>
        {role === "doctor" && (next ? (
          <div className="queue-summary">
            <p>المريض التالي <strong><bdi>{next.patientName}</bdi></strong></p>
            <Link prefetch={false} className="button button--primary" href={`/doctor/visit/${next.appointmentId}`}>
              ابدأ الكشف
            </Link>
          </div>
        ) : <p className="muted">مفيش مريض منتظر.</p>)}
      </section>
      <section className="workspace-panel" aria-label="مواعيد اليوم">
        {queue.items.length > 0 ? <QueueTable items={queue.items} role={role} /> :
          <p className="muted">مفيش مواعيد مسجّلة النهارده.</p>}
      </section>
    </main>
  );
}
