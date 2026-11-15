// Render the secretary's read-only revenue.
import { CashboxView } from "@/features/cashbox/CashboxView";
import { requireRoleOrRedirect } from "@/backend/session";

export default async function SecretaryCashboxPage() {
  await requireRoleOrRedirect("secretary");
  return <CashboxView returnTo="/secretary/queue" />;
}
