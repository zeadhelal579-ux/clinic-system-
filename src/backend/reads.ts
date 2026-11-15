// Load clinic data over the authenticated backend transport.
import "server-only";

import { readClinic } from "./transport";

export async function getCashboxLast7Days() {
  return readClinic("getCashboxLast7Days");
}

export async function getCashboxSummary() {
  return readClinic("getCashboxSummary");
}

export async function getFollowUpBanner() {
  return readClinic("getFollowUpBanner");
}

export async function getMyProfile() {
  return readClinic("getMyProfile");
}

export async function getMyRecord() {
  return readClinic("getMyRecord");
}

export async function getOnlineBookingForEdit(input: unknown) {
  return readClinic("getOnlineBookingForEdit", input);
}

export async function getPatientMedicalFile(input: unknown) {
  return readClinic("getPatientMedicalFile", input);
}

export async function getPatientSummary(input: unknown) {
  return readClinic("getPatientSummary", input);
}

export async function getPrices() {
  return readClinic("getPrices");
}

export async function getQueue(input?: unknown) {
  return readClinic("getQueue", input);
}

export async function getSchedule() {
  return readClinic("getSchedule");
}

export async function getSlots(input: unknown) {
  return readClinic("getSlots", input);
}

export async function getUnseenOnlineCount() {
  return readClinic("getUnseenOnlineCount");
}

export async function getVisitContext(input: unknown) {
  return readClinic("getVisitContext", input);
}

export async function listMyAppointments() {
  return readClinic("listMyAppointments");
}

export async function listOnlineBookings(input?: unknown) {
  return readClinic("listOnlineBookings", input);
}

export async function searchPatients(input: unknown) {
  return readClinic("searchPatients", input);
}
