// Allow only explicit clinic operations over the private HTTP boundary.
import "server-only";
import { getSessionContext } from "../auth/session";
import {
  createAppointment,
  rescheduleAppointment,
  cancelAppointment,
  markArrived,
  listMyAppointments,
  listOnlineBookings,
  getOnlineBookingForEdit,
  markOnlineBookingsSeen,
  getUnseenOnlineCount,
} from "../services/appointments.service";
import {
  registerPatient,
  verifyOtp,
  login,
  requestPasswordReset,
  confirmPasswordReset,
  logout,
} from "../services/auth.service";
import {
  getCashboxSummary,
  getCashboxLast7Days,
} from "../services/cashbox.service";
import {
  searchPatients,
  createWalkInPatient,
  getPatientSummary,
} from "../services/patients.service";
import {
  getPrices,
  updatePrices,
} from "../services/pricing.service";
import {
  getMyProfile,
  completeProfile,
  updateMyProfile,
  requestPhoneChange,
  confirmPhoneChange,
} from "../services/profile.service";
import {
  getQueue,
} from "../services/queue.service";
import {
  getMyRecord,
  getFollowUpBanner,
} from "../services/record.service";
import {
  getSchedule,
  updateSchedule,
} from "../services/schedule.service";
import {
  getSlots,
} from "../services/slots.service";
import {
  getVisitContext,
  endVisit,
  getPatientMedicalFile,
  updatePatientAlerts,
} from "../services/visits.service";

export const clinicOperations = {
  async session() {
    const session = await getSessionContext();
    return session ? { role: session.role } : null;
  },
  cancelAppointment,
  completeProfile,
  confirmPasswordReset,
  confirmPhoneChange,
  createAppointment,
  createWalkInPatient,
  endVisit,
  getCashboxLast7Days,
  getCashboxSummary,
  getFollowUpBanner,
  getMyProfile,
  getMyRecord,
  getOnlineBookingForEdit,
  getPatientMedicalFile,
  getPatientSummary,
  getPrices,
  getQueue,
  getSchedule,
  getSlots,
  getUnseenOnlineCount,
  getVisitContext,
  listMyAppointments,
  listOnlineBookings,
  login,
  logout,
  markArrived,
  markOnlineBookingsSeen,
  registerPatient,
  requestPasswordReset,
  requestPhoneChange,
  rescheduleAppointment,
  searchPatients,
  updateMyProfile,
  updatePatientAlerts,
  updatePrices,
  updateSchedule,
  verifyOtp,
};
