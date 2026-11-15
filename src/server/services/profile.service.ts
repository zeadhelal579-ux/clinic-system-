// Serve patient profile reads and commands using the verified account identity.
import "server-only";
import { fromAuthPhone } from "@/lib/phone/phone";
import { requireRole } from "../auth/require-role";
import { verifyPhoneChangeChallenge } from "../auth/turnstile";
import { AppError } from "../errors/app-error";
import { mapAuthError } from "../errors/map-db-error";
import { parseInput } from "../http/run-action";
import { getAlerts } from "../repositories/alerts.repository";
import { isProfileComplete, toMedicalAlerts } from "../repositories/mappers";
import { getPatientByUserId, saveMyProfile } from "../repositories/patients.repository";
import { confirmPhoneChangeSchema, requestPhoneChangeSchema } from "../schemas/auth.schemas";
import { completeProfileSchema, updateMyProfileSchema } from "../schemas/profile.schemas";
import type { ClinicClient } from "../supabase/server-client";

export async function getMyProfile() {
  const { client, userId } = await requireRole(["patient"]);
  const [patient, phone] = await Promise.all([getPatientByUserId(client, userId), getConfirmedPhone(client)]);
  const alerts = patient ? await getAlerts(client, patient.id) : toMedicalAlerts(null);
  return { patient, phone, alerts, profileComplete: isProfileComplete(patient, alerts) };
}

export async function completeProfile(raw: unknown) {
  const { client } = await requireRole(["patient"]);
  const input = parseInput(completeProfileSchema, raw);
  return { patientId: await saveMyProfile(client, input, "complete") };
}

export async function updateMyProfile(raw: unknown) {
  const { client } = await requireRole(["patient"]);
  const input = parseInput(updateMyProfileSchema, raw);
  return { patientId: await saveMyProfile(client, input, "update") };
}

export async function requestPhoneChange(raw: unknown) {
  const { client } = await requireRole(["patient"]);
  const { newPhone, captchaToken } = parseInput(requestPhoneChangeSchema, raw);
  if (await getConfirmedPhone(client) === newPhone) {
    throw new AppError("VALIDATION_FAILED", { fields: { newPhone: "validation.phone_same" } });
  }
  await verifyPhoneChangeChallenge(captchaToken);
  const { error } = await client.auth.updateUser({ phone: newPhone });
  if (error && error.code !== "phone_exists" && error.code !== "user_already_exists") throw mapAuthError(error);
  return { otpSentAt: new Date().toISOString() };
}

export async function confirmPhoneChange(raw: unknown) {
  const { client, userId } = await requireRole(["patient"]);
  const { newPhone, code } = parseInput(confirmPhoneChangeSchema, raw);
  const { data, error } = await client.auth.verifyOtp({ phone: newPhone, token: code, type: "phone_change" });
  if (error) throw mapAuthError(error, "otp");
  if (data.user?.id !== userId) {
    await client.auth.signOut({ scope: "local" });
    throw new AppError("OTP_INVALID");
  }
  return { phone: await getConfirmedPhone(client) };
}

async function getConfirmedPhone(client: ClinicClient) {
  const { data, error } = await client.auth.getUser();
  if (error) throw mapAuthError(error);
  const phone = fromAuthPhone(data.user?.phone);
  if (!phone || !data.user?.phone_confirmed_at) throw new AppError("FORBIDDEN");
  return phone;
}
