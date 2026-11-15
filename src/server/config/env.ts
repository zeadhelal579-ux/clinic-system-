// Read server-side Supabase endpoints and publishable credentials on demand.
import "server-only";
import { z } from "zod";
import { AppError } from "../errors/app-error";

const supabaseEnv = z.object({
  SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  SUPABASE_PUBLISHABLE_KEY: z.string().refine(isPublishableKey),
});

function isPublishableKey(value: string) {
  if (/^sb_publishable_[\w-]+$/.test(value)) return true;
  const [header, payload, signature] = value.split(".");
  if (!header || !payload || !signature || value.split(".").length !== 3) return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return claims.role === "anon";
  } catch {
    return false;
  }
}

export function getSupabaseEnv() {
  const config = supabaseEnv.safeParse(process.env);
  if (!config.success) throw new AppError("UNAVAILABLE");
  return config.data;
}
