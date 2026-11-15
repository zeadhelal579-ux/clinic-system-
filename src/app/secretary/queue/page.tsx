// Show today's bookings and reception arrival actions to the secretary.
import type { Metadata } from "next";
import { QueueBoard } from "@/features/queue/QueueBoard";
import { requireRoleOrRedirect } from "@/backend/session";
import { getQueue } from "@/backend/reads";
import { getUnseenOnlineCount } from "@/backend/reads";

export const metadata: Metadata = { title: "طابور اليوم" };

export default async function SecretaryQueuePage() {
  await requireRoleOrRedirect("secretary");
  const [queue, { count }] = await Promise.all([getQueue(), getUnseenOnlineCount()]);
  return <QueueBoard role="secretary" queue={queue} unseenOnline={count} />;
}
