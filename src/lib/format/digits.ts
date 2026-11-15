// Convert Arabic-Indic digits while preserving the rest of the input.
export function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) % 16));
}
