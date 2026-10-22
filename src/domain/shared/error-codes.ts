/**
 * Error codes are the contract between domain, API and UI.
 * User-facing copy is never produced here: codes are mapped to dictionary keys by the UI.
 */

/** Input validation codes, attached to a field. */
export const VALIDATION_ERROR_CODES = [
  "IDENTIFIER_REQUIRED",
  "IDENTIFIER_INVALID",
  "AMOUNT_REQUIRED",
  "AMOUNT_INVALID",
  "AMOUNT_NOT_POSITIVE",
  "INSUFFICIENT_FUNDS",
  "RECIPIENT_REQUIRED",
  "CONTACT_NAME_REQUIRED",
  "CONTACT_NAME_TOO_LONG",
  "PHONE_REQUIRED",
  "PHONE_INVALID",
  "INVALID",
] as const;

export type ValidationErrorCode = (typeof VALIDATION_ERROR_CODES)[number];

/** Outcomes of a transfer confirmation that are not a success. */
export const TRANSFER_FAILURE_CODES = [
  "INSUFFICIENT_FUNDS",
  "NETWORK",
  "TIMEOUT",
  "UNKNOWN",
] as const;

export type TransferFailureCode = (typeof TRANSFER_FAILURE_CODES)[number];

export const isValidationErrorCode = (value: string): value is ValidationErrorCode =>
  (VALIDATION_ERROR_CODES as readonly string[]).includes(value);
