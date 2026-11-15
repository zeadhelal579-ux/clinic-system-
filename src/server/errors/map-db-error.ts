// Translate PostgreSQL and Auth failures without returning provider diagnostics.
import "server-only";
import { AppError, type ErrorCode } from "./app-error";

type ProviderError = { code?: string; message: string; hint?: string | null; status?: number };
const knownSql: Record<string, ErrorCode> = {
  "42501": "FORBIDDEN", CL404: "NOT_FOUND", CL409: "INVALID_STATE_TRANSITION",
  CLS22: "SLOT_UNAVAILABLE", CLP03: "PROFILE_INCOMPLETE", "23P01": "SLOT_TAKEN",
};
const knownAuth: Record<string, ErrorCode> = {
  captcha_failed: "CAPTCHA_FAILED", otp_expired: "OTP_INVALID",
  over_sms_send_rate_limit: "RATE_LIMITED", over_request_rate_limit: "RATE_LIMITED",
  over_email_send_rate_limit: "RATE_LIMITED", sms_send_failed: "UNAVAILABLE",
  session_not_found: "UNAUTHENTICATED", bad_jwt: "UNAUTHENTICATED",
};

export function mapDbError(error: ProviderError): AppError {
  if (error.code === "23505" && error.message.includes("patients_phone_key")) {
    return new AppError("PHONE_ALREADY_REGISTERED");
  }
  if (error.code === "CL422" || error.code === "23514" || error.code === "22007" || error.code === "22P02") {
    const key = /^validation\.[a-z_]+$/.test(error.message) ? error.message : "validation.invalid";
    return new AppError("VALIDATION_FAILED", {
      fields: error.hint && /^[a-z][a-zA-Z0-9.]*$/.test(error.hint) ? { [error.hint]: key } : undefined,
    });
  }
  const code = error.code ? knownSql[error.code] : undefined;
  if (code) return new AppError(code);
  if (!error.code || error.code === "PGRST000" || error.code === "PGRST002") return new AppError("UNAVAILABLE");
  return new AppError("INTERNAL");
}

export function mapAuthError(error: ProviderError, context: "otp" | "login" | "general" = "general"): AppError {
  if (error.status === 429) return new AppError("RATE_LIMITED");
  if (error.status && error.status >= 500) return new AppError("UNAVAILABLE");
  const code = error.code ? knownAuth[error.code] : undefined;
  if (code) return new AppError(code);
  if (error.code === "weak_password" || error.code === "same_password") {
    return new AppError("VALIDATION_FAILED", { messageKey: "validation.password_invalid" });
  }
  if (context === "login") return new AppError("UNAUTHENTICATED", { messageKey: "errors.invalid_credentials" });
  if (context === "otp") return new AppError("OTP_INVALID");
  return new AppError("UNAVAILABLE");
}
