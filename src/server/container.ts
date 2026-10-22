import "server-only";

import { createLatency } from "@/adapters/mock/latency";
import {
  createInMemoryAccountRepository,
  createInMemoryContactRepository,
  createInMemoryMovementRepository,
  createInMemorySessionRepository,
  createInMemoryUserRepository,
} from "@/adapters/mock/in-memory-repositories";
import { createInMemoryIdempotencyStore } from "@/adapters/mock/in-memory-idempotency-store";
import { createInMemoryTransferLedger } from "@/adapters/mock/in-memory-transfer-ledger";
import { readMockConfig } from "@/adapters/mock/mock-config";
import { getMockDatabase } from "@/adapters/mock/mock-database";
import type { MockScenario } from "@/adapters/mock/mock-scenarios";
import { createMockTransferProcessor } from "@/adapters/mock/mock-transfer-processor";
import { systemClock } from "@/adapters/system/system-clock";
import { uuidGenerator } from "@/adapters/system/uuid-generator";
import { makeGetAccountOverview, makeListMovements } from "@/application/use-cases/account";
import { makeAuthenticate, makeLogin, makeLogout } from "@/application/use-cases/auth";
import { makeListContacts, makeSaveContact } from "@/application/use-cases/contacts";
import {
  makeCreateTransfer,
  makeGetTransfer,
  makeGetTransferStatus,
} from "@/application/use-cases/transfers";

export interface RequestContext {
  /** Scenario requested by the caller (e.g. an E2E test); ignored when overrides are disabled. */
  readonly scenario?: MockScenario | null;
}

/**
 * Composition root: the only place where ports are bound to adapters. Swapping the mock adapters
 * for real ones (database, payment network) only changes this file.
 */
export const getUseCases = ({ scenario = null }: RequestContext = {}) => {
  const config = readMockConfig();
  const db = getMockDatabase();
  const latency = createLatency(config.latency);
  const clock = systemClock;
  const ids = uuidGenerator;

  const users = createInMemoryUserRepository({ db, latency });
  const accounts = createInMemoryAccountRepository({ db, latency });
  const movements = createInMemoryMovementRepository({ db, latency });
  const contacts = createInMemoryContactRepository({ db, latency, ids });
  const sessions = createInMemorySessionRepository({ db, latency });
  const ledger = createInMemoryTransferLedger({ db, latency, clock, ids });
  const idempotency = createInMemoryIdempotencyStore({ db, latency });
  const processor = createMockTransferProcessor({
    latency,
    timeoutDelayMs: config.timeoutDelayMs,
    scenario: config.scenarioOverrideEnabled ? scenario : null,
  });

  return {
    login: makeLogin({ users, sessions, clock, ids }),
    logout: makeLogout({ sessions }),
    authenticate: makeAuthenticate({ users, sessions, clock }),
    getAccountOverview: makeGetAccountOverview({ users, accounts }),
    listMovements: makeListMovements({ accounts, movements }),
    listContacts: makeListContacts({ contacts }),
    saveContact: makeSaveContact({ contacts }),
    createTransfer: makeCreateTransfer({ accounts, contacts, ledger, idempotency, processor }),
    getTransferStatus: makeGetTransferStatus({ idempotency }),
    getTransfer: makeGetTransfer({ accounts, ledger }),
  };
};

export type UseCases = ReturnType<typeof getUseCases>;
