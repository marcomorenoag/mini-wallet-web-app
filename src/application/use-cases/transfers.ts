import type { Account } from "@/domain/account/account";
import type { Contact } from "@/domain/contact/contact";
import type { Money } from "@/domain/money/money";
import type { TransferFailureCode } from "@/domain/shared/error-codes";
import { err, ok, type Result } from "@/domain/shared/result";
import { toValidationIssues } from "@/domain/shared/validation";
import {
  type IdempotencyKey,
  IdempotencyKeySchema,
  type Transfer,
  TransferDraftSchema,
  TransferIdSchema,
  type TransferOutcome,
  type TransferRecipient,
} from "@/domain/transfer/transfer";
import { validateTransferRules } from "@/domain/transfer/transfer-rules";
import type { UserId } from "@/domain/user/user";
import type { AccountRepository } from "@/ports/account-repository";
import type { ContactRepository } from "@/ports/contact-repository";
import type { IdempotencyStore, StoredTransferOutcome } from "@/ports/idempotency-store";
import type { TransferLedger } from "@/ports/transfer-ledger";
import type { TransferProcessor } from "@/ports/transfer-processor";

import { type AppError, fieldError, NOT_FOUND, validationError } from "../errors";

interface TransferDeps {
  readonly accounts: AccountRepository;
  readonly contacts: ContactRepository;
  readonly ledger: TransferLedger;
  readonly idempotency: IdempotencyStore;
  readonly processor: TransferProcessor;
}

/** Failures after which nothing was applied, so the same idempotency key may be retried. */
const RETRYABLE_FAILURES: ReadonlySet<TransferFailureCode> = new Set([
  "NETWORK",
  "TIMEOUT",
  "UNKNOWN",
]);

const failed = (code: TransferFailureCode): StoredTransferOutcome => ({ status: "FAILED", code });

/**
 * Confirms a transfer. Business rules are re-validated against the current balance (the server is
 * the source of truth), and the idempotency key guarantees that retries never debit twice:
 * - a key with a final outcome returns that outcome again;
 * - a key still being processed returns `PENDING`;
 * - a retryable failure releases the key, so the client can retry with it.
 */
export const makeCreateTransfer =
  ({ accounts, contacts, ledger, idempotency, processor }: TransferDeps) =>
  async (userId: UserId, input: unknown): Promise<Result<TransferOutcome, AppError>> => {
    const parsed = TransferDraftSchema.safeParse(input);
    if (!parsed.success) return err(validationError(toValidationIssues(parsed.error)));
    const { amount, recipientId, idempotencyKey } = parsed.data;

    const previous = await idempotency.find(userId, idempotencyKey);
    if (previous) return ok(previous);

    const [account, contact] = await Promise.all([
      accounts.findByOwnerId(userId),
      contacts.findById(userId, recipientId),
    ]);
    if (!account) return err(NOT_FOUND);
    if (!contact) return err(fieldError("recipientId", "RECIPIENT_NOT_FOUND"));

    const rules = validateTransferRules({ amount, balance: account.balance, recipient: contact });
    if (!rules.ok && !rules.error.includes("INSUFFICIENT_FUNDS")) {
      return err(validationError(rules.error.map((code) => ({ field: "amount", code }))));
    }

    if (!(await idempotency.reserve(userId, idempotencyKey))) {
      // A concurrent request with the same key won the reservation.
      return ok((await idempotency.find(userId, idempotencyKey)) ?? { status: "PENDING" });
    }

    try {
      const outcome = rules.ok
        ? await authorizeAndCommit(
            { ledger, processor },
            { account, contact, amount, idempotencyKey },
          )
        : failed("INSUFFICIENT_FUNDS");

      if (outcome.status === "FAILED" && RETRYABLE_FAILURES.has(outcome.code)) {
        await idempotency.release(userId, idempotencyKey);
      } else {
        await idempotency.resolve(userId, idempotencyKey, outcome);
      }
      return ok(outcome);
    } catch (error) {
      await idempotency.release(userId, idempotencyKey);
      throw error;
    }
  };

interface AuthorizeAndCommitCommand {
  readonly account: Account;
  readonly contact: Contact;
  readonly amount: Money;
  readonly idempotencyKey: IdempotencyKey;
}

const authorizeAndCommit = async (
  { ledger, processor }: Pick<TransferDeps, "ledger" | "processor">,
  { account, contact, amount, idempotencyKey }: AuthorizeAndCommitCommand,
): Promise<StoredTransferOutcome> => {
  const recipient: TransferRecipient = {
    contactId: contact.id,
    name: contact.name,
    phone: contact.phone,
  };

  const authorization = await processor.process({ idempotencyKey, recipient, amount });
  if (authorization.status === "REJECTED") return failed(authorization.code);

  // The ledger re-checks the balance atomically, guarding against concurrent debits.
  const committed = await ledger.commit({ account, recipient, amount, idempotencyKey });
  return committed.ok
    ? { status: "COMPLETED", transfer: committed.value }
    : failed(committed.error);
};

/** Status lookup by idempotency key, used after a client-side timeout. */
export const makeGetTransferStatus =
  ({ idempotency }: Pick<TransferDeps, "idempotency">) =>
  async (userId: UserId, key: unknown): Promise<Result<TransferOutcome, AppError>> => {
    const parsed = IdempotencyKeySchema.safeParse(key);
    if (!parsed.success) return err(fieldError("idempotencyKey", "INVALID"));

    const outcome = await idempotency.find(userId, parsed.data);
    return outcome ? ok(outcome) : err(NOT_FOUND);
  };

/** Completed transfer for the voucher, scoped to the requesting user's account. */
export const makeGetTransfer =
  ({ accounts, ledger }: Pick<TransferDeps, "accounts" | "ledger">) =>
  async (userId: UserId, transferId: unknown): Promise<Result<Transfer, AppError>> => {
    const parsed = TransferIdSchema.safeParse(transferId);
    if (!parsed.success) return err(NOT_FOUND);

    const account = await accounts.findByOwnerId(userId);
    if (!account) return err(NOT_FOUND);

    const transfer = await ledger.findById(account.id, parsed.data);
    return transfer ? ok(transfer) : err(NOT_FOUND);
  };
