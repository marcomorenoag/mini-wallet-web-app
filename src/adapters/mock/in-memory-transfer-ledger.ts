import { MovementSchema } from "@/domain/account/movement";
import { isGreaterThan, subtract } from "@/domain/money/money";
import { err, ok } from "@/domain/shared/result";
import { TransferSchema } from "@/domain/transfer/transfer";
import type { Clock, IdGenerator } from "@/ports/system";
import type { TransferLedger } from "@/ports/transfer-ledger";

import type { Latency } from "./latency";
import type { MockDatabase } from "./mock-database";

interface Deps {
  readonly db: MockDatabase;
  readonly latency: Latency;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export const createInMemoryTransferLedger = ({
  db,
  latency,
  clock,
  ids,
}: Deps): TransferLedger => ({
  async commit({ account: { id: accountId }, recipient, amount, idempotencyKey }) {
    await latency();

    // Critical section: no `await` between the balance check and the writes, so it runs
    // atomically on the event loop (the in-memory equivalent of a database transaction).
    const account = db.accounts.get(accountId);
    if (!account) throw new Error(`Account not found: ${accountId}`);
    if (isGreaterThan(amount, account.balance)) return err("INSUFFICIENT_FUNDS");

    const createdAt = clock.now().toISOString();
    const transfer = TransferSchema.parse({
      id: `trf_${ids.next()}`,
      idempotencyKey,
      accountId,
      recipient,
      amount,
      createdAt,
    });
    const movement = MovementSchema.parse({
      id: `mov_${ids.next()}`,
      accountId,
      type: "TRANSFER_OUT",
      amount,
      counterpartyName: recipient.name,
      createdAt,
    });

    db.accounts.set(accountId, { ...account, balance: subtract(account.balance, amount) });
    db.movements.push(movement);
    db.transfers.push(transfer);

    return ok(transfer);
  },

  async findById(accountId, id) {
    await latency();
    return db.transfers.find((t) => t.accountId === accountId && t.id === id) ?? null;
  },
});
