import { z } from "zod";

const MX_COUNTRY_CODE = "52";
const MX_NATIONAL_NUMBER = /^(?:\+?52)?(\d{10})$/;
const PHONE_SEPARATORS = /[\s\-().]/g;

/**
 * Normalizes a Mexican phone number to E.164 (`+52XXXXXXXXXX`).
 * Spaces, dashes, dots and parentheses are ignored; an optional `+52`/`52` prefix is accepted.
 * `null` is returned when the input is not a valid 10-digit national number.
 */
export const normalizeMxPhone = (raw: string): string | null => {
  const match = MX_NATIONAL_NUMBER.exec(raw.replace(PHONE_SEPARATORS, ""));
  return match?.[1] ? `+${MX_COUNTRY_CODE}${match[1]}` : null;
};

/** Required Mexican phone number, output normalized to E.164. */
export const MxPhoneSchema = z
  .string({ error: "PHONE_REQUIRED" })
  .trim()
  .min(1, { error: "PHONE_REQUIRED" })
  .transform((value, ctx) => {
    const phone = normalizeMxPhone(value);
    if (phone === null) {
      ctx.issues.push({ code: "custom", message: "PHONE_INVALID", input: value });
      return z.NEVER;
    }
    return phone;
  });
