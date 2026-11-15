// Orchestrate patient OTP, password sign-in, and session lifecycle.
import "server-only";
import { AppError } from "../errors/app-error";
import { mapAuthError } from "../errors/map-db-error";
import { createSupabaseForRequest, type ClinicClient } from "../supabase/server-client";
import { homeFor } from "../auth/route-access";
import { parseInput } from "../http/run-action";
import { getMyRole } from "../repositories/roles.repository";
import { getPatientByUserId, linkPatientForSession } from "../repositories/patients.repository";
import { getAlerts } from "../repositories/alerts.repository";
import { isProfileComplete } from "../repositories/mappers";
import {
  confirmPasswordResetSchema, loginSchema, registerPatientSchema, requestPasswordResetSchema, verifyOtpSchema,
} from "../schemas/auth.schemas";

export async function registerPatient(raw: unknown) {
  const { phone, password, captchaToken } = parseInput(registerPatientSchema, raw);
  const client = await createSupabaseForRequest();
  const { error } = await client.auth.signUp({ phone, password, options: { captchaToken } });
  if (error && error.code !== "phone_exists" && error.code !== "user_already_exists") throw mapAuthError(error);
  return { phone, otpSentAt: new Date().toISOString() };
}

export async function verifyOtp(raw: unknown) {
  const { phone, code } = parseInput(verifyOtpSchema, raw);
  const client = await createSupabaseForRequest();
  const { data, error } = await client.auth.verifyOtp({ phone, token: code, type: "sms" });
  if (error) throw mapAuthError(error, "otp");
  if (!data.user || !data.session) throw new AppError("OTP_INVALID");

  try {
    if (await getMyRole(client) !== "patient") throw new AppError("FORBIDDEN");
    await linkPatientForSession(client);
    return { role: "patient" as const, needsProfile: !await profileIsComplete(client, data.user.id) };
  } catch (cause) {
    await client.auth.signOut({ scope: "local" });
    throw cause;
  }
}

export async function login(raw: unknown) {
  const { identifier, password, captchaToken } = parseInput(loginSchema, raw);
  const client = await createSupabaseForRequest();
  const credentials = identifier.includes("@") ? { email: identifier } : { phone: identifier };
  const { data, error } = await client.auth.signInWithPassword({ ...credentials, password, options: { captchaToken } });
  if (error) throw mapAuthError(error, "login");
  if (!data.user || !data.session) throw new AppError("UNAUTHENTICATED");

  try {
    const role = await getMyRole(client);
    if (!role) throw new AppError("FORBIDDEN");
    const profileComplete = role !== "patient" || await profileIsComplete(client, data.user.id);
    return { role, redirectTo: homeFor(role, profileComplete) };
  } catch (cause) {
    await client.auth.signOut({ scope: "local" });
    throw cause;
  }
}

export async function requestPasswordReset(raw: unknown) {
  const { phone, captchaToken } = parseInput(requestPasswordResetSchema, raw);
  const client = await createSupabaseForRequest();
  const { error } = await client.auth.signInWithOtp({ phone, options: { shouldCreateUser: false, captchaToken } });
  const masked = new Set(["otp_disabled", "user_not_found", "signup_disabled"]);
  if (error && !masked.has(error.code ?? "")) throw mapAuthError(error);
  return { otpSentAt: new Date().toISOString() };
}

export async function confirmPasswordReset(raw: unknown) {
  const { phone, code, newPassword } = parseInput(confirmPasswordResetSchema, raw);
  const client = await createSupabaseForRequest();
  const { data, error } = await client.auth.verifyOtp({ phone, token: code, type: "sms" });
  if (error) throw mapAuthError(error, "otp");
  if (!data.user || !data.session) throw new AppError("OTP_INVALID");
  try {
    if (await getMyRole(client) !== "patient") throw new AppError("FORBIDDEN");
    const update = await client.auth.updateUser({ password: newPassword });
    if (update.error) throw mapAuthError(update.error);
    const signOut = await client.auth.signOut({ scope: "global" });
    if (signOut.error) throw mapAuthError(signOut.error);
    return { done: true as const };
  } catch (cause) {
    await client.auth.signOut({ scope: "local" });
    throw cause;
  }
}

export async function logout() {
  const client = await createSupabaseForRequest();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error && error.name !== "AuthSessionMissingError") throw mapAuthError(error);
  return { done: true as const };
}

async function profileIsComplete(client: ClinicClient, userId: string) {
  const patient = await getPatientByUserId(client, userId);
  if (!patient) return false;
  return isProfileComplete(patient, await getAlerts(client, patient.id));
}
