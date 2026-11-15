// Resolve the clinic labels and translated validation or server errors.
import messages from "../../messages/ar.json";

export const clinicName = messages.clinic;
export const clinicDescription = messages.description;

const localizedErrors = new Map<string, string>([
  ...Object.entries(messages.errors).map(([key, value]) => [`errors.${key}`, value] as const),
  ...Object.entries(messages.validation).map(([key, value]) => [`validation.${key}`, value] as const),
]);

export function errorMessage(key: string, fallback = messages.errors.internal): string {
  return localizedErrors.get(key) ?? fallback;
}
