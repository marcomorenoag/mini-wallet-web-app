import { type Account, type AccountId, AccountSchema } from "@/domain/account/account";
import { type Movement, MovementSchema } from "@/domain/account/movement";
import type { Session, SessionToken } from "@/domain/auth/session";
import { type Contact, ContactSchema } from "@/domain/contact/contact";
import type { Transfer, TransferOutcome } from "@/domain/transfer/transfer";
import { type User, type UserId, UserSchema } from "@/domain/user/user";

import { accountFixtures, contactFixtures, movementFixtures, userFixtures } from "./fixtures";

/** In-memory state shared by all mock adapters. */
export interface MockDatabase {
  readonly users: Map<UserId, User>;
  readonly accounts: Map<AccountId, Account>;
  readonly movements: Movement[];
  readonly contacts: Contact[];
  readonly transfers: Transfer[];
  readonly sessions: Map<SessionToken, Session>;
  /** Keyed by `${ownerId}:${idempotencyKey}`. */
  readonly idempotency: Map<string, TransferOutcome>;
}

export const createMockDatabase = (): MockDatabase => ({
  users: new Map(userFixtures.map((fixture) => UserSchema.parse(fixture)).map((u) => [u.id, u])),
  accounts: new Map(
    accountFixtures.map((fixture) => AccountSchema.parse(fixture)).map((a) => [a.id, a]),
  ),
  movements: movementFixtures.map((fixture) => MovementSchema.parse(fixture)),
  contacts: contactFixtures.map((fixture) => ContactSchema.parse(fixture)),
  transfers: [],
  sessions: new Map(),
  idempotency: new Map(),
});

// A globalThis singleton keeps the data across hot reloads and across route modules.
const GLOBAL_KEY = Symbol.for("mini-wallet.mock-database");
type GlobalWithDatabase = typeof globalThis & { [GLOBAL_KEY]?: MockDatabase };

export const getMockDatabase = (): MockDatabase =>
  ((globalThis as GlobalWithDatabase)[GLOBAL_KEY] ??= createMockDatabase());

/** Restores the seed data (used by tests and E2E setup). */
export const resetMockDatabase = (): MockDatabase =>
  ((globalThis as GlobalWithDatabase)[GLOBAL_KEY] = createMockDatabase());
