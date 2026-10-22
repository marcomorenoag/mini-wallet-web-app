import type { ContactDto } from "@/contracts/v1/dto";
import { type Money, parseMajorUnits } from "@/domain/money/money";
import type { ValidationErrorCode } from "@/domain/shared/error-codes";
import { validateTransferRules } from "@/domain/transfer/transfer-rules";

/** Wizard steps, kept in the URL (`?step=`) so refresh and browser back work. */
export const TRANSFER_STEPS = ["amount", "recipient", "summary"] as const;
export type TransferStep = (typeof TRANSFER_STEPS)[number];

export const parseStep = (value: string | null): TransferStep =>
  (TRANSFER_STEPS as readonly (string | null)[]).includes(value)
    ? (value as TransferStep)
    : "amount";

/** Client state of a transfer being prepared. */
export interface TransferDraft {
  /** Raw input, so the user's formatting is kept while typing. */
  readonly amountInput: string;
  readonly recipientId: string | null;
  /** Contacts available for selection; new ones are appended after being saved. */
  readonly contacts: readonly ContactDto[];
  /** Generated once per draft and reused on every retry, so a transfer is never applied twice. */
  readonly idempotencyKey: string;
}

export type TransferAction =
  | { readonly type: "AMOUNT_CHANGED"; readonly input: string }
  | { readonly type: "RECIPIENT_SELECTED"; readonly contactId: string }
  | { readonly type: "CONTACT_SAVED"; readonly contact: ContactDto }
  | { readonly type: "RESET"; readonly idempotencyKey: string };

export const createDraft = (
  contacts: readonly ContactDto[],
  idempotencyKey: string,
): TransferDraft => ({ amountInput: "", recipientId: null, contacts, idempotencyKey });

export const transferFlowReducer = (
  draft: TransferDraft,
  action: TransferAction,
): TransferDraft => {
  switch (action.type) {
    case "AMOUNT_CHANGED":
      return { ...draft, amountInput: action.input };
    case "RECIPIENT_SELECTED":
      return { ...draft, recipientId: action.contactId };
    case "CONTACT_SAVED":
      // A saved contact is selected right away, as it was added for this transfer.
      return {
        ...draft,
        contacts: [...draft.contacts.filter(({ id }) => id !== action.contact.id), action.contact],
        recipientId: action.contact.id,
      };
    case "RESET":
      return createDraft(draft.contacts, action.idempotencyKey);
  }
};

export type AmountCheck =
  | { readonly ok: true; readonly amount: Money }
  | { readonly ok: false; readonly code: ValidationErrorCode };

/** Amount rules (format, > 0, ≤ balance), run for instant feedback; the server re-checks them. */
export const checkAmount = (input: string, balance: Money): AmountCheck => {
  const parsed = parseMajorUnits(input, balance.currency);
  if (!parsed.ok) return { ok: false, code: parsed.error };

  const rules = validateTransferRules({ amount: parsed.value, balance, recipient: true });
  return rules.ok ? { ok: true, amount: parsed.value } : { ok: false, code: rules.error[0]! };
};

export const selectedRecipient = (draft: TransferDraft): ContactDto | null =>
  draft.contacts.find(({ id }) => id === draft.recipientId) ?? null;

/**
 * Earliest step whose prerequisites are missing, if the requested one cannot be shown yet
 * (e.g. after a refresh, which clears the in-memory draft).
 */
export const firstIncompleteStep = (draft: TransferDraft, balance: Money): TransferStep | null => {
  if (!checkAmount(draft.amountInput, balance).ok) return "amount";
  if (!selectedRecipient(draft)) return "recipient";
  return null;
};
