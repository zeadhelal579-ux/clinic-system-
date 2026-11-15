// Display the clinic's recorded revenue using the server-calculated totals.
import Link from "next/link";
import type { ReactNode } from "react";
import { clinicDate } from "@/lib/format/format";
import { getCashboxLast7Days, getCashboxSummary } from "@/backend/reads";

const currency = new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" });

export async function CashboxView({ returnTo, children }: { returnTo: string; children?: ReactNode }) {
  const [summary, { days }] = await Promise.all([getCashboxSummary(), getCashboxLast7Days()]);
  const periods = [["today", "النهارده"], ["week", "الأسبوع الحالي"], ["month", "الشهر الحالي"]] as const;

  return (
    <main className="workspace-content">
      <div className="screen-heading"><Link href={returnTo}>الرجوع للطابور</Link><h1>الخزنة</h1></div>
      <section className="form-columns" aria-label="ملخص الإيراد">
        {periods.map(([period, label]) => (
          <article key={period} className="workspace-panel">
            <h2>{label}</h2>
            <p><strong>{currency.format(summary[period].revenue)}</strong></p>
            <p>{summary[period].visitCount.toLocaleString("ar-EG")} زيارة مكتملة</p>
          </article>
        ))}
      </section>
      {children}
      <section className="workspace-panel">
        <h2>آخر ٧ أيام</h2>
        <div className="queue-table" role="region" aria-label="إيراد آخر سبعة أيام" tabIndex={0}>
          <table>
            <thead><tr><th scope="col">التاريخ</th><th scope="col">كشف</th><th scope="col">متابعة</th><th scope="col">الإيراد</th></tr></thead>
            <tbody>{days.toReversed().map((day) => (
              <tr key={day.date}>
                <td><time dateTime={day.date}>{clinicDate.format(new Date(day.date))}</time>{day.isDayOff && " · إجازة"}</td>
                <td>{day.newCount.toLocaleString("ar-EG")}</td><td>{day.followUpCount.toLocaleString("ar-EG")}</td>
                <td>{currency.format(day.revenue)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
