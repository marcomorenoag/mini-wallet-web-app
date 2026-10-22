import { z } from "zod";

import { normalizeMxPhone } from "../shared/phone";

/** A login is performed with either an email address or a Mexican phone number. */
export type LoginIdentifier =
  | { readonly type: "email"; readonly value: string }
  | { readonly type: "phone"; readonly value: string };

const EmailSchema = z.email();

/**
 * Single login field that accepts an email or a phone number.
 * Emails are lower-cased; phone numbers are normalized to E.164.
 */
export const LoginIdentifierSchema = z
  .string({ error: "IDENTIFIER_REQUIRED" })
  .trim()
  .min(1, { error: "IDENTIFIER_REQUIRED" })
  .transform((value, ctx): LoginIdentifier => {
    if (value.includes("@")) {
      const email = value.toLowerCase();
      if (EmailSchema.safeParse(email).success) return { type: "email", value: email };
    } else {
      const phone = normalizeMxPhone(value);
      if (phone !== null) return { type: "phone", value: phone };
    }
    ctx.issues.push({ code: "custom", message: "IDENTIFIER_INVALID", input: value });
    return z.NEVER;
  });

export const LoginInputSchema = z.object({ identifier: LoginIdentifierSchema });

export type LoginInput = z.input<typeof LoginInputSchema>;
