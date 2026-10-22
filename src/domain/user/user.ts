import { z } from "zod";

export const UserIdSchema = z.string().min(1).brand<"UserId">();
export type UserId = z.infer<typeof UserIdSchema>;

export const UserSchema = z
  .object({
    id: UserIdSchema,
    name: z.string().min(1),
    email: z.email(),
    /** E.164 phone number. */
    phone: z.string().min(1),
  })
  .readonly();

export type User = z.infer<typeof UserSchema>;
