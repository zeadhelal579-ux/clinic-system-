// Validate credential and one-time-code inputs before calling Supabase Auth.
import { z } from "zod";
import { normalizeEgyptPhone } from "@/lib/phone/phone";
import { captchaSchema, phoneInputSchema } from "./common.schemas";

export const phoneSchema = phoneInputSchema.transform((value, context) => {
  const phone = normalizeEgyptPhone(value);
  if (phone) return phone;
  context.addIssue({ code: "custom", message: "validation.phone_invalid" });
  return z.NEVER;
});
const passwordSchema = z.string().min(8, "validation.password_too_short").refine(
  (password) => new TextEncoder().encode(password).length <= 72,
  "validation.password_too_long",
);
const code = z.string().regex(/^\d{6}$/, "validation.otp_format");

export const registerPatientSchema = z.strictObject({ phone: phoneSchema, password: passwordSchema, captchaToken: captchaSchema });
export const verifyOtpSchema = z.strictObject({ phone: phoneSchema, code });
export const loginSchema = z.strictObject({
  identifier: z.string().trim().min(1).max(254).transform((value, context) => {
    const identifier = value.includes("@") ? z.email().safeParse(value.toLowerCase()).data : normalizeEgyptPhone(value);
    if (identifier) return identifier;
    context.addIssue({ code: "custom", message: "validation.identifier_invalid" });
    return z.NEVER;
  }),
  password: z.string().min(1).max(1024),
  captchaToken: captchaSchema,
});
export const requestPasswordResetSchema = z.strictObject({ phone: phoneSchema, captchaToken: captchaSchema });
export const confirmPasswordResetSchema = z.strictObject({ phone: phoneSchema, code, newPassword: passwordSchema });
export const requestPhoneChangeSchema = z.strictObject({ newPhone: phoneSchema, captchaToken: captchaSchema });
export const confirmPhoneChangeSchema = z.strictObject({ newPhone: phoneSchema, code });
