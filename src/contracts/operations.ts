// Describe the JSON results returned by the clinic backend.
import type { Appointment, DoctorVisitView, MedicalAlerts, PatientBasic, QueueItem, RevenueFigures, Role, VisitView } from "./clinic";

export interface OperationData {
  session: { role: Role | null } | null;
  createAppointment: {
    appointment: Appointment;
  };
  rescheduleAppointment: {
    appointment: Appointment;
  };
  cancelAppointment: {
    appointment: Appointment;
  };
  markArrived: {
    appointment: Appointment;
  };
  listMyAppointments: {
    next: Appointment | null;
    upcoming: Appointment[];
    past: Appointment[];
  };
  listOnlineBookings: {
    items: {
      appointment: Appointment;
      patientName: string;
      age: number;
      createdAt: string;
      isNew: boolean;
    }[];
    page: number;
    pageSize: number;
    total: number;
  };
  getOnlineBookingForEdit: Appointment;
  markOnlineBookingsSeen: {
    updated: number;
  };
  getUnseenOnlineCount: {
    count: number;
  };
  registerPatient: {
    phone: string;
    otpSentAt: string;
  };
  verifyOtp: {
    role: "patient";
    needsProfile: boolean;
  };
  login: {
    role: Role;
    redirectTo: string;
  };
  requestPasswordReset: {
    otpSentAt: string;
  };
  confirmPasswordReset: {
    done: true;
  };
  logout: {
    done: true;
  };
  getCashboxSummary: {
    today: RevenueFigures;
    week: RevenueFigures;
    month: RevenueFigures;
  };
  getCashboxLast7Days: {
    days: {
      visitCount: number;
      newCount: number;
      followUpCount: number;
      revenue: number;
      date: string;
      weekday: number;
      isDayOff: boolean;
    }[];
  };
  searchPatients: {
    items: {
      patientId: string;
      fullName: string;
      age: number;
      phone: string;
      lastVisitAt: string | null;
      nextAppointmentAt: string | null;
    }[];
    page: number;
    pageSize: number;
    total: number;
  };
  createWalkInPatient: {
    patientId: string;
  };
  getPatientSummary: {
    patient: PatientBasic;
    nextAppointment: Appointment;
    previousAppointments: Appointment[];
  };
  getPrices: {
    priceNew: number;
    priceFollowUp: number;
    updatedAt: string;
  };
  updatePrices: {
    priceNew: number;
    priceFollowUp: number;
  };
  getMyProfile: {
    patient: PatientBasic | null;
    phone: string;
    alerts: MedicalAlerts;
    profileComplete: boolean;
  };
  completeProfile: {
    patientId: string;
  };
  updateMyProfile: {
    patientId: string;
  };
  requestPhoneChange: {
    otpSentAt: string;
  };
  confirmPhoneChange: {
    phone: string;
  };
  getQueue: {
    date: string;
    items: QueueItem[];
    counters: {
      total: number;
      arrived: number;
      waiting: number;
    };
    nextAppointmentId: string;
  };
  getMyRecord: {
    lastVisit: VisitView;
    visits: VisitView[];
  };
  getFollowUpBanner: {
    followUpDate: string | null;
  };
  getSchedule: {
    slotMinutes: number;
    workingHours: {
      weekday: number;
      isOpen: boolean;
      startTime: string;
      endTime: string;
    }[];
    daysOff: {
      date: string;
      note: string | null;
    }[];
  };
  updateSchedule: {
    slotMinutes: number;
    workingHours: {
      weekday: number;
      isOpen: boolean;
      startTime: string;
      endTime: string;
    }[];
    daysOff: {
      date: string;
      note: string | null;
    }[];
  };
  getSlots: {
    slots: {
      start: string;
      end: string;
      available: boolean;
    }[];
    date: string;
    open: boolean;
  };
  getVisitContext: {
    appointment: Appointment;
    patient: PatientBasic;
    alerts: MedicalAlerts;
    lastVisit: DoctorVisitView;
    olderVisits: DoctorVisitView[];
  };
  endVisit: {
    appointmentId: string;
    status: "done";
    priceCharged: number;
  };
  getPatientMedicalFile: {
    patient: PatientBasic;
    alerts: MedicalAlerts;
    visits: DoctorVisitView[];
  };
  updatePatientAlerts: {
    alerts: MedicalAlerts;
  };
}
