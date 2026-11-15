// Show the queue rows with actions permitted for the current role.
import { appointmentStatusLabel, clinicTime, visitTypeLabel } from "@/lib/format/format";
import type { QueueItem } from "@/contracts/clinic";
import { ArrivedButton } from "./ArrivedButton";

export function QueueTable({ items, role }: { items: QueueItem[]; role: "secretary" | "doctor" }) {
  return (
    <div className="queue-table" role="region" aria-label="جدول طابور اليوم" tabIndex={0}>
      <table aria-label="جدول طابور اليوم">
        <thead><tr>
          <th scope="col">الوقت</th><th scope="col">المريض</th><th scope="col">العمر</th>
          <th scope="col">الزيارة</th><th scope="col">المصدر</th><th scope="col">الحالة</th>
          {role === "secretary" && <th scope="col">الإجراء</th>}
        </tr></thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.appointmentId}>
              <td><time dateTime={row.slotStart}>{clinicTime.format(new Date(row.slotStart))}</time></td>
              <td><bdi>{row.patientName}</bdi></td>
              <td>{row.age.toLocaleString("ar-EG")}</td>
              <td>{visitTypeLabel[row.visitType]}</td>
              <td>{row.source === "online" ? "أونلاين" : "العيادة"}</td>
              <td>{row.isMissed ? "فات موعده" : appointmentStatusLabel[row.status]}</td>
              {role === "secretary" && <td>{row.status === "booked" && <ArrivedButton appointmentId={row.appointmentId} />}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
