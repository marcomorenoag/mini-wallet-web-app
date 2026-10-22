import type { ValidationErrorCode } from "@/domain/shared/error-codes";
import type { ValidationIssue } from "@/domain/shared/validation";

/** Expected failures of a use case. Infrastructure faults are thrown instead. */
export type AppError =
  | { readonly kind: "VALIDATION"; readonly issues: readonly ValidationIssue[] }
  | { readonly kind: "UNAUTHENTICATED" }
  | { readonly kind: "NOT_FOUND" };

export const validationError = (issues: readonly ValidationIssue[]): AppError => ({
  kind: "VALIDATION",
  issues,
});

export const fieldError = (field: string, code: ValidationErrorCode): AppError =>
  validationError([{ field, code }]);

export const UNAUTHENTICATED: AppError = { kind: "UNAUTHENTICATED" };

export const NOT_FOUND: AppError = { kind: "NOT_FOUND" };
