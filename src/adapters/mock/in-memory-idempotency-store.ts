import type { IdempotencyStore } from "@/ports/idempotency-store";

import type { Latency } from "./latency";
import type { MockDatabase } from "./mock-database";

const keyOf = (ownerId: string, key: string): string => `${ownerId}:${key}`;

export const createInMemoryIdempotencyStore = ({
  db,
  latency,
}: {
  readonly db: MockDatabase;
  readonly latency: Latency;
}): IdempotencyStore => ({
  async find(ownerId, key) {
    await latency();
    return db.idempotency.get(keyOf(ownerId, key)) ?? null;
  },
  async reserve(ownerId, key) {
    await latency();
    const id = keyOf(ownerId, key);
    if (db.idempotency.has(id)) return false;
    db.idempotency.set(id, { status: "PENDING" });
    return true;
  },
  async resolve(ownerId, key, outcome) {
    await latency();
    db.idempotency.set(keyOf(ownerId, key), outcome);
  },
  async release(ownerId, key) {
    await latency();
    const id = keyOf(ownerId, key);
    // Only a pending reservation is released; final outcomes are never discarded.
    if (db.idempotency.get(id)?.status === "PENDING") db.idempotency.delete(id);
  },
});
