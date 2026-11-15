// Read the live application role from the database rather than from JWT metadata.
import "server-only";
import type { ClinicClient } from "../supabase/server-client";
import type { Role } from "../types/shared";
import { optionalResult } from "./query-result";

export async function getMyRole(client: ClinicClient): Promise<Role | null> {
  const role: unknown = optionalResult(await client.rpc("get_my_role"));
  return role === "patient" || role === "secretary" || role === "doctor" ? role : null;
}
