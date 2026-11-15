// Translate database storage fields into application contracts.
import "server-only";
import { utcInstant } from "@/lib/time/clinic-time";
import type { MedicalAlerts, Appointment, AppointmentStatus, AppointmentSource, VisitType, PatientBasic, RevenueFigures } from "../types/shared";

export type PatientRow = {
  id: string; full_name: string; age: number; phone: string; address: string;
};
export type AppointmentRow = {
  id: string; patient_id: string; slot_start: string; slot_end: string; status: AppointmentStatus;
  source: AppointmentSource; visit_type: VisitType; arrived_at: string | null;
  secretary_seen_at: string | null; created_at: string;
};
export type AlertRow = {
  has_allergy: boolean | null; allergy_text: string | null;
  has_chronic_disease: boolean | null; chronic_disease_text: string | null;
  takes_chronic_meds: boolean | null; chronic_meds_text: string | null;
  updated_at: string; updated_by_role: "doctor" | "patient" | null;
};

export function toPatientBasic(row: PatientRow): PatientBasic {
  return { id: row.id, fullName: row.full_name, age: row.age, phone: row.phone, address: row.address };
}

export function toMedicalAlerts(row: AlertRow | null): MedicalAlerts {
  return {
    hasAllergy: row?.has_allergy ?? null,
    allergyText: row?.allergy_text ?? null,
    hasChronicDisease: row?.has_chronic_disease ?? null,
    chronicDiseaseText: row?.chronic_disease_text ?? null,
    takesChronicMeds: row?.takes_chronic_meds ?? null,
    chronicMedsText: row?.chronic_meds_text ?? null,
    updatedAt: row ? utcInstant(row.updated_at) : null,
    updatedByRole: row?.updated_by_role ?? null,
  };
}

export function isProfileComplete(patient: PatientBasic | null, alerts: MedicalAlerts) {
  return patient !== null && alerts.hasAllergy !== null && alerts.hasChronicDisease !== null;
}

export function toAppointment(row: AppointmentRow, now: Date): Appointment {
  return {
    id: row.id,
    patientId: row.patient_id,
    slotStart: utcInstant(row.slot_start),
    slotEnd: utcInstant(row.slot_end),
    visitType: row.visit_type,
    source: row.source,
    status: row.status,
    isMissed: row.status === "booked" && Date.parse(row.slot_end) <= now.getTime(),
  };
}

export function toRevenue(row: {
  visit_count: number; new_count: number; follow_up_count: number; revenue: number;
}): RevenueFigures {
  return { visitCount: row.visit_count, newCount: row.new_count, followUpCount: row.follow_up_count, revenue: Number(row.revenue) };
}
