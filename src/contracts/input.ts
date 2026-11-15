// Validate route parameters before requesting clinic data.
import { z } from "zod";

export const uuidSchema = z.uuid("validation.id_invalid");
export const dateSchema = z.iso.date("validation.date_invalid");
export const appointmentIdSchema = z.strictObject({ appointmentId: uuidSchema });
export const QUEUE_DATE_RANGE_DAYS = 366;
