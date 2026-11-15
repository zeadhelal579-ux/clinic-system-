// JSON contracts shared by the server and the clinic screens.
export type Role = "patient" | "secretary" | "doctor";
export type VisitType = "new" | "follow_up";
export type AppointmentStatus = "booked" | "arrived" | "done" | "cancelled";
export type AppointmentSource = "online" | "clinic";
export type PatientBasic = { id: string; fullName: string; age: number; phone: string; address: string };
export type MedicalAlerts = {
  hasAllergy: boolean | null;
  allergyText: string | null;
  hasChronicDisease: boolean | null;
  chronicDiseaseText: string | null;
  takesChronicMeds: boolean | null;
  chronicMedsText: string | null;
  updatedAt: string | null;
  updatedByRole: "patient" | "doctor" | null;
};
export type Appointment = {
  id: string;
  patientId: string;
  slotStart: string;
  slotEnd: string;
  visitType: VisitType;
  source: AppointmentSource;
  status: AppointmentStatus;
  isMissed: boolean;
};
export type QueueItem = {
  appointmentId: string;
  slotStart: string;
  patientId: string;
  patientName: string;
  age: number;
  visitType: VisitType;
  source: AppointmentSource;
  status: AppointmentStatus;
  arrivedAt: string | null;
  isMissed: boolean;
};
export type Prescription = { drugName: string; dose: string; duration: string };
export type VisitView = {
  appointmentId: string;
  slotStart: string;
  visitType: VisitType;
  diagnosis: string;
  instructions: string | null;
  followUpDate: string | null;
  endedAt: string;
  prescriptions: Prescription[];
};
export type DoctorVisitView = VisitView & { privateNote: string | null };
export type Page<T> = { items: T[]; page: number; pageSize: number; total: number };
export type Slot = { start: string; end: string; available: boolean };
export type RevenueFigures = { visitCount: number; newCount: number; followUpCount: number; revenue: number };
