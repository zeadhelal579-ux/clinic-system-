// Validate staff patient search and walk-in registration.
import { z } from "zod";
import { paginationSchema } from "./common.schemas";
import { phoneSchema } from "./auth.schemas";
import { basicProfileSchema } from "./profile.schemas";

export const searchPatientsSchema = paginationSchema.extend({
  q: z.string().trim().max(100, "validation.query_too_long").default(""),
  sort: z.enum(["fullName", "-fullName", "lastVisitAt", "-lastVisitAt", "nextAppointmentAt", "-nextAppointmentAt"]).default("fullName"),
}).strict();
export const createWalkInPatientSchema = basicProfileSchema.extend({ phone: phoneSchema }).strict();
