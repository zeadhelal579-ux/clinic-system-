// Restrict the reception workspace to secretary accounts.
import type { ReactNode } from "react";
import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";
import { requireRoleOrRedirect } from "@/backend/session";

export const dynamic = "force-dynamic";

export default async function SecretaryLayout({ children }: { children: ReactNode }) {
  await requireRoleOrRedirect("secretary");
  return <div className="workspace"><WorkspaceHeader />{children}</div>;
}
