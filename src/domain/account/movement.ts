import { z } from "zod";

import { MoneySchema, type Money } from "../money/money";
import { AccountIdSchema } from "./account";

export const MovementIdSchema = z.string().min(1).brand<"MovementId">();
export type MovementId = z.infer<typeof MovementIdSchema>;

export const MOVEMENT_TYPES = ["DEPOSIT", "TRANSFER_IN", "TRANSFER_OUT"] as const;
export const MovementTypeSchema = z.enum(MOVEMENT_TYPES);
export type MovementType = z.infer<typeof MovementTypeSchema>;

/**
 * A movement records a balance change. Its amount is always positive;
 * the direction (credit/debit) is derived from its type.
 */
export const MovementSchema = z
  .object({
    id: MovementIdSchema,
    accountId: AccountIdSchema,
    type: MovementTypeSchema,
    amount: MoneySchema.refine((value) => value.amount > 0, { error: "AMOUNT_NOT_POSITIVE" }),
    counterpartyName: z.string().min(1),
    createdAt: z.iso.datetime(),
  })
  .readonly();

export type Movement = z.infer<typeof MovementSchema>;

const CREDIT_TYPES: ReadonlySet<MovementType> = new Set(["DEPOSIT", "TRANSFER_IN"]);

export const isCredit = (movement: Pick<Movement, "type">): boolean =>
  CREDIT_TYPES.has(movement.type);

/** Signed amount: positive for credits, negative for debits. */
export const signedAmount = (movement: Pick<Movement, "type" | "amount">): Money => ({
  ...movement.amount,
  amount: isCredit(movement) ? movement.amount.amount : -movement.amount.amount,
});
