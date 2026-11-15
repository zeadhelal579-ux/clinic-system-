// Validate phone-change challenges because the Auth update-user SDK does not accept a CAPTCHA token.
import "server-only";
import { AppError } from "../errors/app-error";
import { getSupabaseEnv } from "../config/env";

const siteVerifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const deadlineMs = 5_000;
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export async function verifyPhoneChangeChallenge(token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    const config = getSupabaseEnv();
    if (process.env.NODE_ENV !== "production" && localHosts.has(new URL(config.SUPABASE_URL).hostname)) return;
    throw new AppError("UNAVAILABLE");
  }

  let result: { success?: boolean; hostname?: string; action?: string };
  try {
    const reply = await fetch(siteVerifyUrl, {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(deadlineMs),
    });
    if (!reply.ok) throw new AppError("UNAVAILABLE");
    result = await reply.json();
  } catch {
    throw new AppError("UNAVAILABLE");
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new AppError("UNAVAILABLE");
  if (!result.success || result.hostname !== new URL(appUrl).hostname || result.action !== "phone_change") {
    throw new AppError("CAPTCHA_FAILED");
  }
}
