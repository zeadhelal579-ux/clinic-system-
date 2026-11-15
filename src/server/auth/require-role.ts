// Enforce role checks in clinic services.
import "server-only";
import { AppError } from "../errors/app-error";
import type { Role } from "../types/shared";
import { getSessionContext } from "./session";

export async function requireRole<AllowedRole extends Role>(roles: readonly AllowedRole[]) {
  const session = await getSessionContext();
  if (!session) throw new AppError("UNAUTHENTICATED");
  const allowed = roles.find((role) => role === session.role);
  if (!allowed) throw new AppError("FORBIDDEN");
  return { ...session, role: allowed };
}
