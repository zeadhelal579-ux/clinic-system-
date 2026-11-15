// Validate completion of a clinical visit and its optional prescription lines.
import { z } from "zod";
import { dateSchema, uuidSchema } from "./common.schemas";

const prescriptionSchema = z.strictObject({
  drugName: z.string().trim().min(1).max(100),
  dose: z.string().trim().min(1).max(100),
  duration: z.string().trim().min(1).max(100),
});

export const endVisitSchema = z.strictObject({
  appointmentId: uuidSchema,
  diagnosis: z.string().trim().min(1, "validation.required").max(2000),
  instructions: z.string().trim().max(2000).nullish(),
  followUpDate: dateSchema.nullish(),
  prescriptions: z.array(prescriptionSchema).max(20, "validation.too_many_prescriptions"),
  privateNote: z.string().trim().max(5000).nullish(),
});
