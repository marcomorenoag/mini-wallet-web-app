import type { z } from "zod";

import { isValidationErrorCode, type ValidationErrorCode } from "./error-codes";

export interface ValidationIssue {
  /** Dot-separated path of the offending field; empty for the root value. */
  readonly field: string;
  readonly code: ValidationErrorCode;
}

/**
 * Schemas declare their error codes as Zod messages, so issues are translated back into
 * typed codes. Unknown messages (e.g. Zod defaults) fall back to the generic "INVALID".
 */
export const toValidationIssues = (error: z.ZodError): readonly ValidationIssue[] =>
  error.issues.map((issue) => ({
    field: issue.path.map(String).join("."),
    code: isValidationErrorCode(issue.message) ? issue.message : "INVALID",
  }));
