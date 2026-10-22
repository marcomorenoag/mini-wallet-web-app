import { z } from "zod";

import { MxPhoneSchema } from "../shared/phone";
import { UserIdSchema } from "../user/user";

export const CONTACT_NAME_MAX_LENGTH = 60;

export const ContactIdSchema = z.string().min(1).brand<"ContactId">();
export type ContactId = z.infer<typeof ContactIdSchema>;

/** Transfer recipient saved by a user. Recipients are identified by phone number. */
export const ContactSchema = z
  .object({
    id: ContactIdSchema,
    ownerId: UserIdSchema,
    name: z.string().min(1),
    /** E.164 phone number. */
    phone: z.string().min(1),
    isFavorite: z.boolean(),
  })
  .readonly();

export type Contact = z.infer<typeof ContactSchema>;

/** Input for manually adding a new contact. */
export const NewContactInputSchema = z.object({
  name: z
    .string({ error: "CONTACT_NAME_REQUIRED" })
    .trim()
    .min(1, { error: "CONTACT_NAME_REQUIRED" })
    .max(CONTACT_NAME_MAX_LENGTH, { error: "CONTACT_NAME_TOO_LONG" }),
  phone: MxPhoneSchema,
  isFavorite: z.boolean().default(true),
});

export type NewContactInput = z.input<typeof NewContactInputSchema>;
export type NewContact = z.output<typeof NewContactInputSchema>;
