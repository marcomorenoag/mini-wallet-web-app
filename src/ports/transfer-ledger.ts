import type { Account, AccountId } from "@/domain/account/account";
import type { Money } from "@/domain/money/money";
import type { Result } from "@/domain/shared/result";
import type {
  IdempotencyKey,
  Transfer,
  TransferId,
  TransferRecipient,
} from "@/domain/transfer/transfer";

export interface CommitTransferCommand {
  readonly account: Pick<Account, "id">;
  readonly recipient: TransferRecipient;
  readonly amount: Money;
  readonly idempotencyKey: IdempotencyKey;
}

/**
 * Applies a transfer atomically: the balance is checked and debited, the movement is recorded and
 * the transfer is stored as a single unit of work (a database transaction in a real adapter).
 */
export interface TransferLedger {
  commit(command: CommitTransferCommand): Promise<Result<Transfer, "INSUFFICIENT_FUNDS">>;
  findById(accountId: AccountId, id: TransferId): Promise<Transfer | null>;
}
