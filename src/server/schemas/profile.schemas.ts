// Normalize the medical-alert form and enforce its conditional fields.
import { z } from "zod";
import { uuidSchema } from "./common.schemas";

export const basicProfileSchema = z.object({
  fullName: z.string().trim().min(2, "validation.full_name_length").max(100, "validation.full_name_length"),
  age: z.number().int().min(0, "validation.age_range").max(120, "validation.age_range"),
  address: z.string().trim().min(3, "validation.address_length").max(300, "validation.address_length"),
});

const medicalShape = {
  hasAllergy: z.boolean(),
  allergyText: z.string().trim().max(200).nullish(),
  hasChronicDisease: z.boolean(),
  chronicDiseaseText: z.string().trim().max(200).nullish(),
  takesChronicMeds: z.boolean().nullish(),
  chronicMedsText: z.string().trim().max(300).nullish(),
};
type MedicalInput = z.infer<z.ZodObject<typeof medicalShape>>;

function validateMedicalFields(value: MedicalInput, context: z.RefinementCtx) {
  const missing: string[] = [];
  if (value.hasAllergy && !value.allergyText) missing.push("allergyText");
  if (value.hasChronicDisease && !value.chronicDiseaseText) missing.push("chronicDiseaseText");
  if (value.hasChronicDisease && value.takesChronicMeds == null) missing.push("takesChronicMeds");
  if (value.hasChronicDisease && value.takesChronicMeds && !value.chronicMedsText) missing.push("chronicMedsText");
  for (const field of missing) context.addIssue({ code: "custom", path: [field], message: "validation.required" });
}

export function normalizeMedicalFields(value: MedicalInput) {
  return {
    has_allergy: value.hasAllergy,
    allergy_text: value.hasAllergy ? value.allergyText ?? null : null,
    has_chronic_disease: value.hasChronicDisease,
    chronic_disease_text: value.hasChronicDisease ? value.chronicDiseaseText ?? null : null,
    takes_chronic_meds: value.hasChronicDisease ? value.takesChronicMeds ?? null : null,
    chronic_meds_text: value.hasChronicDisease && value.takesChronicMeds ? value.chronicMedsText ?? null : null,
  };
}

export const completeProfileSchema = z.strictObject({ ...basicProfileSchema.shape, ...medicalShape }).superRefine(validateMedicalFields);
export const updateMyProfileSchema = completeProfileSchema;
export const updatePatientAlertsSchema = z.strictObject({ patientId: uuidSchema, ...medicalShape }).superRefine(validateMedicalFields);
