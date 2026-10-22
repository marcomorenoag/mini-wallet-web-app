import { isGreaterThan, isPositive, type Money } from "../money/money";
import type { ValidationErrorCode } from "../shared/error-codes";
import { err, ok, type Result } from "../shared/result";

export type TransferRuleViolation = Extract<
  ValidationErrorCode,
  "AMOUNT_NOT_POSITIVE" | "INSUFFICIENT_FUNDS" | "RECIPIENT_REQUIRED"
>;

export interface TransferRuleInput<TRecipient> {
  readonly amount: Money;
  readonly balance: Money;
  readonly recipient: TRecipient | null | undefined;
}

export interface ValidatedTransfer<TRecipient> {
  readonly amount: Money;
  readonly recipient: TRecipient;
}

/**
 * Business rules that must hold before a transfer is confirmed:
 * 1. The amount must be greater than zero.
 * 2. The amount must not exceed the available balance.
 * 3. A recipient is required.
 *
 * This function is pure, so the same rules are run in the browser (instant feedback) and on the
 * server (source of truth, against the current balance). All violations are reported at once.
 * The recipient type is generic, so the rules can be run before and after the contact is resolved.
 */
export const validateTransferRules = <TRecipient>(
  input: TransferRuleInput<TRecipient>,
): Result<ValidatedTransfer<TRecipient>, readonly TransferRuleViolation[]> => {
  const { amount, balance, recipient } = input;
  const violations: TransferRuleViolation[] = [];

  if (!isPositive(amount)) {
    violations.push("AMOUNT_NOT_POSITIVE");
  } else if (isGreaterThan(amount, balance)) {
    violations.push("INSUFFICIENT_FUNDS");
  }

  if (recipient === null || recipient === undefined) {
    return err([...violations, "RECIPIENT_REQUIRED"]);
  }

  return violations.length > 0 ? err(violations) : ok({ amount, recipient });
};
