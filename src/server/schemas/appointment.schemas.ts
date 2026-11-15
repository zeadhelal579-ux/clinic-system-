// Validate scheduling dates, appointment actions, and online booking acknowledgements.
import { z } from "zod";
import { dateSchema, instantSchema, paginationSchema, uuidSchema } from "./common.schemas";

export const getSlotsSchema = z.strictObject({ date: dateSchema });
export const getQueueSchema = z.strictObject({ date: dateSchema.optional() });
export const createAppointmentSchema = z.strictObject({
  patientId: uuidSchema.optional(),
  slotStart: instantSchema,
  visitType: z.enum(["new", "follow_up"], "validation.visit_type_invalid"),
});
export const rescheduleAppointmentSchema = z.strictObject({ appointmentId: uuidSchema, newSlotStart: instantSchema });
export const listOnlineBookingsSchema = paginationSchema.strict();
export const markOnlineBookingsSeenSchema = z.strictObject({
  appointmentIds: z.array(uuidSchema).min(1).max(50).refine((ids) => new Set(ids).size === ids.length),
});
