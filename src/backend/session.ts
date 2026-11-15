// Resolve the current role through the backend and guard page navigation.
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@/contracts/clinic";
import { homeFor } from "@/contracts/route-access";
import { readClinic } from "./transport";

export const getSessionContext = cache(async () => {
  if (!(await headers()).get("cookie")) return null;
  return readClinic("session");
});

export async function requireRoleOrRedirect(role: Role) {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  if (!session.role) redirect("/");
  if (session.role !== role) redirect(homeFor(session.role));
  return session;
}
