import {
  createInMemoryAccountRepository,
  createInMemoryContactRepository,
  createInMemoryMovementRepository,
  createInMemorySessionRepository,
  createInMemoryUserRepository,
} from "@/adapters/mock/in-memory-repositories";
import { createInMemoryIdempotencyStore } from "@/adapters/mock/in-memory-idempotency-store";
import { createInMemoryTransferLedger } from "@/adapters/mock/in-memory-transfer-ledger";
import { noLatency } from "@/adapters/mock/latency";
import { createMockDatabase } from "@/adapters/mock/mock-database";
import type { Clock, IdGenerator } from "@/ports/system";
import type { ProcessTransferResult, TransferProcessor } from "@/ports/transfer-processor";

/** Clock whose time is moved by hand. */
export const createFixedClock = (initial = "2026-10-22T12:00:00.000Z") => {
  let current = new Date(initial);
  const clock: Clock = { now: () => new Date(current) };
  return {
    clock,
    advance: (ms: number) => {
      current = new Date(current.getTime() + ms);
    },
  };
};

/** Deterministic ids: `id-1`, `id-2`, … */
export const createSequentialIds = (): IdGenerator => {
  let next = 0;
  return { next: () => `id-${++next}` };
};

/** Processor stub whose results are queued per test; approves by default. */
export const createStubProcessor = (...results: ProcessTransferResult[]) => {
  const queue = [...results];
  const calls: unknown[] = [];
  const processor: TransferProcessor = {
    async process(request) {
      calls.push(request);
      return queue.shift() ?? { status: "APPROVED" };
    },
  };
  return { processor, calls };
};

/** Fresh seeded in-memory adapters with no latency, a fixed clock and sequential ids. */
export const createInMemoryDeps = () => {
  const db = createMockDatabase();
  const latency = noLatency;
  const { clock, advance } = createFixedClock();
  const ids = createSequentialIds();

  return {
    db,
    clock,
    advance,
    ids,
    users: createInMemoryUserRepository({ db, latency }),
    accounts: createInMemoryAccountRepository({ db, latency }),
    movements: createInMemoryMovementRepository({ db, latency }),
    contacts: createInMemoryContactRepository({ db, latency, ids }),
    sessions: createInMemorySessionRepository({ db, latency }),
    ledger: createInMemoryTransferLedger({ db, latency, clock, ids }),
    idempotency: createInMemoryIdempotencyStore({ db, latency }),
  };
};
