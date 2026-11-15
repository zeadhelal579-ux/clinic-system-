// Restrict the patient workspace to verified patient accounts.
import type { ReactNode } from "react";
import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";
import { requireRoleOrRedirect } from "@/backend/session";

export const dynamic = "force-dynamic";

export default async function PatientLayout({ children }: { children: ReactNode }) {
  await requireRoleOrRedirect("patient");
  return <div className="workspace"><WorkspaceHeader />{children}</div>;
}
