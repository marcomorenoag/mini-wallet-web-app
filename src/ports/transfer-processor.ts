import type { Money } from "@/domain/money/money";
import type { TransferFailureCode } from "@/domain/shared/error-codes";
import type { IdempotencyKey, TransferRecipient } from "@/domain/transfer/transfer";

export interface ProcessTransferRequest {
  readonly idempotencyKey: IdempotencyKey;
  readonly recipient: TransferRecipient;
  readonly amount: Money;
}

export type ProcessTransferResult =
  | { readonly status: "APPROVED" }
  | { readonly status: "REJECTED"; readonly code: TransferFailureCode };

/** External payment network that authorizes a transfer before it is applied to the ledger. */
export interface TransferProcessor {
  process(request: ProcessTransferRequest): Promise<ProcessTransferResult>;
}
