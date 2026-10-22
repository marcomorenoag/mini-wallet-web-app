import { z } from "zod";

import { UserIdSchema } from "../user/user";

export const SessionTokenSchema = z.string().min(1).brand<"SessionToken">();
export type SessionToken = z.infer<typeof SessionTokenSchema>;

export const SessionSchema = z
  .object({
    token: SessionTokenSchema,
    userId: UserIdSchema,
    expiresAt: z.iso.datetime(),
  })
  .readonly();

export type Session = z.infer<typeof SessionSchema>;

export const isSessionExpired = (session: Pick<Session, "expiresAt">, now: Date): boolean =>
  new Date(session.expiresAt).getTime() <= now.getTime();
