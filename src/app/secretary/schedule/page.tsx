// Load the clinic schedule within the secretary workspace.
import Link from "next/link";
import { ScheduleForm } from "@/features/schedule/ScheduleForm";
import { requireRoleOrRedirect } from "@/backend/session";
import { getSchedule } from "@/backend/reads";

export default async function SchedulePage() {
  await requireRoleOrRedirect("secretary");
  return (
    <main className="workspace-content workspace-content--narrow">
      <div className="screen-heading"><Link href="/secretary/queue">طابور اليوم</Link><h1>المواعيد المتاحة</h1></div>
      <ScheduleForm initial={await getSchedule()} />
    </main>
  );
}
