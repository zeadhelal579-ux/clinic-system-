// Display the caller's signed visits and optional follow-up recommendation.
import "server-only";
import { requireRole } from "../auth/require-role";
import { getPatientByUserId } from "../repositories/patients.repository";
import { getMyFollowUpDate, getPatientVisits } from "../repositories/visits.repository";

export async function getMyRecord() {
  const { client, userId } = await requireRole(["patient"]);
  const patient = await getPatientByUserId(client, userId);
  const visits = patient ? await getPatientVisits(client, patient.id) : [];
  return { lastVisit: visits[0] ?? null, visits };
}

export async function getFollowUpBanner() {
  const { client } = await requireRole(["patient"]);
  return { followUpDate: await getMyFollowUpDate(client) };
}
