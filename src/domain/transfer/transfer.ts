import { z } from "zod";

import { AccountIdSchema } from "../account/account";
import { ContactIdSchema } from "../contact/contact";
import { MoneySchema } from "../money/money";
import type { TransferFailureCode } from "../shared/error-codes";

export const TransferIdSchema = z.string().min(1).brand<"TransferId">();
export type TransferId = z.infer<typeof TransferIdSchema>;

/** Generated once per transfer draft and reused on retries, so a transfer is never applied twice. */
export const IdempotencyKeySchema = z.uuid().brand<"IdempotencyKey">();
export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>;

/** Snapshot of the recipient at confirmation time; later contact edits do not alter receipts. */
export const TransferRecipientSchema = z
  .object({
    contactId: ContactIdSchema,
    name: z.string().min(1),
    phone: z.string().min(1),
  })
  .readonly();

export type TransferRecipient = z.infer<typeof TransferRecipientSchema>;

/** A completed transfer, as shown on the voucher. */
export const TransferSchema = z
  .object({
    id: TransferIdSchema,
    idempotencyKey: IdempotencyKeySchema,
    accountId: AccountIdSchema,
    recipient: TransferRecipientSchema,
    amount: MoneySchema,
    createdAt: z.iso.datetime(),
  })
  .readonly();

export type Transfer = z.infer<typeof TransferSchema>;

/**
 * Transfer request as submitted for confirmation. Only the shape is checked here;
 * business rules (positive amount, sufficient funds) are checked by `validateTransferRules`.
 */
export const TransferDraftSchema = z.object({
  amount: MoneySchema,
  recipientId: z
    .string({ error: "RECIPIENT_REQUIRED" })
    .min(1, { error: "RECIPIENT_REQUIRED" })
    .pipe(ContactIdSchema),
  idempotencyKey: IdempotencyKeySchema,
});

export type TransferDraft = z.output<typeof TransferDraftSchema>;

export type TransferOutcome =
  | { readonly status: "COMPLETED"; readonly transfer: Transfer }
  | { readonly status: "FAILED"; readonly code: TransferFailureCode };
