// Show today's queue and the next waiting patient to the doctor.
import type { Metadata } from "next";
import { QueueBoard } from "@/features/queue/QueueBoard";
import { requireRoleOrRedirect } from "@/backend/session";
import { getQueue } from "@/backend/reads";

export const metadata: Metadata = { title: "الدور" };

export default async function DoctorQueuePage() {
  await requireRoleOrRedirect("doctor");
  return <QueueBoard role="doctor" queue={await getQueue()} />;
}
