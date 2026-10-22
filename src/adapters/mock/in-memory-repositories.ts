import { ContactSchema } from "@/domain/contact/contact";
import type { AccountRepository } from "@/ports/account-repository";
import type { ContactRepository } from "@/ports/contact-repository";
import type { MovementRepository } from "@/ports/movement-repository";
import type { SessionRepository } from "@/ports/session-repository";
import type { IdGenerator } from "@/ports/system";
import type { UserRepository } from "@/ports/user-repository";

import type { Latency } from "./latency";
import type { MockDatabase } from "./mock-database";

interface Deps {
  readonly db: MockDatabase;
  readonly latency: Latency;
}

export const createInMemoryUserRepository = ({ db, latency }: Deps): UserRepository => ({
  async findById(id) {
    await latency();
    return db.users.get(id) ?? null;
  },
  async findByIdentifier(identifier) {
    await latency();
    for (const user of db.users.values()) {
      if (user[identifier.type] === identifier.value) return user;
    }
    return null;
  },
});

export const createInMemoryAccountRepository = ({ db, latency }: Deps): AccountRepository => ({
  async findByOwnerId(ownerId) {
    await latency();
    for (const account of db.accounts.values()) {
      if (account.ownerId === ownerId) return account;
    }
    return null;
  },
});

export const createInMemoryMovementRepository = ({ db, latency }: Deps): MovementRepository => ({
  async listByAccountId(accountId, { limit }) {
    await latency();
    return db.movements
      .filter((movement) => movement.accountId === accountId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  },
});

export const createInMemoryContactRepository = ({
  db,
  latency,
  ids,
}: Deps & { readonly ids: IdGenerator }): ContactRepository => ({
  async listByOwnerId(ownerId) {
    await latency();
    return db.contacts.filter((contact) => contact.ownerId === ownerId);
  },
  async findById(ownerId, id) {
    await latency();
    return db.contacts.find((c) => c.ownerId === ownerId && c.id === id) ?? null;
  },
  async findByPhone(ownerId, phone) {
    await latency();
    return db.contacts.find((c) => c.ownerId === ownerId && c.phone === phone) ?? null;
  },
  async create(ownerId, contact) {
    await latency();
    const created = ContactSchema.parse({ id: `cnt_${ids.next()}`, ownerId, ...contact });
    db.contacts.push(created);
    return created;
  },
});

export const createInMemorySessionRepository = ({ db, latency }: Deps): SessionRepository => ({
  async save(session) {
    await latency();
    db.sessions.set(session.token, session);
  },
  async findByToken(token) {
    await latency();
    return db.sessions.get(token) ?? null;
  },
  async delete(token) {
    await latency();
    db.sessions.delete(token);
  },
});
