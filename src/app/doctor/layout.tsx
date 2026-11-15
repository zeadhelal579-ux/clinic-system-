// Restrict the clinical staff workspace to doctor accounts.
import type { ReactNode } from "react";
import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";
import { requireRoleOrRedirect } from "@/backend/session";

export const dynamic = "force-dynamic";

export default async function DoctorLayout({ children }: { children: ReactNode }) {
  await requireRoleOrRedirect("doctor");
  return <div className="workspace"><WorkspaceHeader />{children}</div>;
}
