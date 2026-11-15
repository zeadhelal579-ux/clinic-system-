// Verify the caller's signed session and resolve their current application role.
import "server-only";
import { cache } from "react";
import { createSupabaseForRequest } from "../supabase/server-client";
import { getMyRole } from "../repositories/roles.repository";
import { mapAuthError } from "../errors/map-db-error";

export const getSessionContext = cache(async () => {
  const client = await createSupabaseForRequest();
  const { data, error } = await client.auth.getClaims();
  if (error && (error.status === 0 || (error.status ?? 0) >= 500)) throw mapAuthError(error);
  if (!data?.claims.sub) return null;
  const role = await getMyRole(client);
  return { client, userId: data.claims.sub, role };
});
