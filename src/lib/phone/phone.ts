// Normalize Egyptian mobile numbers to the stored E.164 representation.
import { parsePhoneNumberFromString } from "libphonenumber-js/min";

export function normalizeEgyptPhone(raw: string): string | null {
  const ascii = raw.trim().replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) % 16));
  if (!/^\+?[\d .()-]{7,30}$/.test(ascii)) return null;
  const phone = parsePhoneNumberFromString(ascii, { defaultCountry: "EG", extract: false });
  if (!phone?.isValid() || phone.country !== "EG" || !/^\+20(?:10|11|12|15)\d{8}$/.test(phone.number)) return null;
  return phone.number;
}

export function fromAuthPhone(phone: string | undefined): string | null {
  if (!phone) return null;
  return normalizeEgyptPhone(phone.startsWith("+") ? phone : "+" + phone);
}
