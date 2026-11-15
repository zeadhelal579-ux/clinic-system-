// Keep browser mutations behind same-origin Server Actions.
"use server";

import { callCommand } from "./transport";

export async function cancelAppointment(input: unknown) {
  return callCommand("cancelAppointment", input);
}

export async function completeProfile(input: unknown) {
  return callCommand("completeProfile", input);
}

export async function confirmPasswordReset(input: unknown) {
  return callCommand("confirmPasswordReset", input);
}

export async function confirmPhoneChange(input: unknown) {
  return callCommand("confirmPhoneChange", input);
}

export async function createAppointment(input: unknown) {
  return callCommand("createAppointment", input);
}

export async function createWalkInPatient(input: unknown) {
  return callCommand("createWalkInPatient", input);
}

export async function endVisit(input: unknown) {
  return callCommand("endVisit", input);
}

export async function login(input: unknown) {
  return callCommand("login", input);
}

export async function logout() {
  return callCommand("logout");
}

export async function markArrived(input: unknown) {
  return callCommand("markArrived", input);
}

export async function markOnlineBookingsSeen(input: unknown) {
  return callCommand("markOnlineBookingsSeen", input);
}

export async function registerPatient(input: unknown) {
  return callCommand("registerPatient", input);
}

export async function requestPasswordReset(input: unknown) {
  return callCommand("requestPasswordReset", input);
}

export async function requestPhoneChange(input: unknown) {
  return callCommand("requestPhoneChange", input);
}

export async function rescheduleAppointment(input: unknown) {
  return callCommand("rescheduleAppointment", input);
}

export async function updateMyProfile(input: unknown) {
  return callCommand("updateMyProfile", input);
}

export async function updatePatientAlerts(input: unknown) {
  return callCommand("updatePatientAlerts", input);
}

export async function updatePrices(input: unknown) {
  return callCommand("updatePrices", input);
}

export async function updateSchedule(input: unknown) {
  return callCommand("updateSchedule", input);
}

export async function verifyOtp(input: unknown) {
  return callCommand("verifyOtp", input);
}
