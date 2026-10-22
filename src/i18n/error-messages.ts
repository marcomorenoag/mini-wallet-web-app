import type { ProblemCode } from "@/contracts/v1/problem";
import type { ValidationErrorCode } from "@/domain/shared/error-codes";

/**
 * Error codes coming from the domain and the API are translated into dictionary keys here, so
 * user-facing copy never travels over the wire. Keys are relative to the `errors` namespace.
 */
export const validationMessageKey = (code: ValidationErrorCode) => `validation.${code}` as const;

export const problemMessageKey = (code: ProblemCode) => `problem.${code}` as const;
