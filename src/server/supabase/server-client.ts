// Create a request-scoped Supabase client using encrypted-transport, server-only session cookies.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_TIMEOUT_MS } from "../config/constants";
import { getSupabaseEnv } from "../config/env";

export const sessionCookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

export const fetchWithTimeout: typeof fetch = (input, init) => {
  const deadline = AbortSignal.timeout(SUPABASE_TIMEOUT_MS);
  const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
  return fetch(input, { ...init, cache: "no-store", signal: signal ? AbortSignal.any([signal, deadline]) : deadline });
};

export async function createSupabaseForRequest() {
  const env = getSupabaseEnv();
  const store = await cookies();
  return createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: sessionCookieOptions,
    global: { fetch: fetchWithTimeout },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        for (const { name, value, options } of values) store.set(name, value, options);
      },
    },
  });
}

export type ClinicClient = Awaited<ReturnType<typeof createSupabaseForRequest>>;
