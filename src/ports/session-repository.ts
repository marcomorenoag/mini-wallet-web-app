import type { Session, SessionToken } from "@/domain/auth/session";

export interface SessionRepository {
  save(session: Session): Promise<void>;
  findByToken(token: SessionToken): Promise<Session | null>;
  delete(token: SessionToken): Promise<void>;
}
