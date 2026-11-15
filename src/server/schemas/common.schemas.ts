// Share IDs, calendar values, and pagination validation across operations.
import { z } from "zod";

export const uuidSchema = z.uuid("validation.id_invalid");
export const dateSchema = z.iso.date("validation.date_invalid");
export const instantSchema = z.iso.datetime("validation.datetime_invalid");
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export const appointmentIdSchema = z.strictObject({ appointmentId: uuidSchema });
export const patientIdSchema = z.strictObject({ patientId: uuidSchema });
export const phoneInputSchema = z.string().trim().min(7).max(32);
export const captchaSchema = z.string().trim().min(1, "validation.captcha_required").max(2048);
