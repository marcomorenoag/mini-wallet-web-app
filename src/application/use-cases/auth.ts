import { LoginInputSchema } from "@/domain/auth/login-identifier";
import {
  isSessionExpired,
  type Session,
  type SessionToken,
  SessionTokenSchema,
} from "@/domain/auth/session";
import { err, ok, type Result } from "@/domain/shared/result";
import { toValidationIssues } from "@/domain/shared/validation";
import type { User } from "@/domain/user/user";
import type { SessionRepository } from "@/ports/session-repository";
import type { Clock, IdGenerator } from "@/ports/system";
import type { UserRepository } from "@/ports/user-repository";

import { type AppError, fieldError, UNAUTHENTICATED, validationError } from "../errors";

export const SESSION_TTL_MS = 60 * 60 * 1000;

interface AuthDeps {
  readonly users: UserRepository;
  readonly sessions: SessionRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export interface LoginResult {
  readonly session: Session;
  readonly user: User;
}

export const makeLogin =
  ({ users, sessions, clock, ids }: AuthDeps) =>
  async (input: unknown): Promise<Result<LoginResult, AppError>> => {
    const parsed = LoginInputSchema.safeParse(input);
    if (!parsed.success) return err(validationError(toValidationIssues(parsed.error)));

    const user = await users.findByIdentifier(parsed.data.identifier);
    // A mocked login: no secret is checked, only the existence of the account.
    if (!user) return err(fieldError("identifier", "IDENTIFIER_NOT_FOUND"));

    const session: Session = {
      token: SessionTokenSchema.parse(ids.next()),
      userId: user.id,
      expiresAt: new Date(clock.now().getTime() + SESSION_TTL_MS).toISOString(),
    };
    await sessions.save(session);

    return ok({ session, user });
  };

export const makeLogout =
  ({ sessions }: Pick<AuthDeps, "sessions">) =>
  async (token: SessionToken): Promise<void> => {
    await sessions.delete(token);
  };

/** Resolves the user behind a session token; expired sessions are removed. */
export const makeAuthenticate =
  ({ users, sessions, clock }: Pick<AuthDeps, "users" | "sessions" | "clock">) =>
  async (token: SessionToken | undefined): Promise<Result<User, AppError>> => {
    if (!token) return err(UNAUTHENTICATED);

    const session = await sessions.findByToken(token);
    if (!session) return err(UNAUTHENTICATED);

    if (isSessionExpired(session, clock.now())) {
      await sessions.delete(token);
      return err(UNAUTHENTICATED);
    }

    const user = await users.findById(session.userId);
    return user ? ok(user) : err(UNAUTHENTICATED);
  };
