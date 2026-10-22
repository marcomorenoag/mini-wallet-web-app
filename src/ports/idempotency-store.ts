import type { IdempotencyKey, TransferOutcome } from "@/domain/transfer/transfer";
import type { UserId } from "@/domain/user/user";

/** Final outcomes stored per idempotency key; keys are scoped to their owner. */
export type StoredTransferOutcome = Exclude<TransferOutcome, { status: "PENDING" }>;

export interface IdempotencyStore {
  find(ownerId: UserId, key: IdempotencyKey): Promise<TransferOutcome | null>;
  /**
   * Reserves the key as `PENDING`. `false` is returned when the key is already reserved or
   * resolved, so concurrent requests with the same key are never processed twice.
   */
  reserve(ownerId: UserId, key: IdempotencyKey): Promise<boolean>;
  resolve(ownerId: UserId, key: IdempotencyKey, outcome: StoredTransferOutcome): Promise<void>;
  /** Releases a reservation after a retryable failure, so the same key can be retried. */
  release(ownerId: UserId, key: IdempotencyKey): Promise<void>;
}
