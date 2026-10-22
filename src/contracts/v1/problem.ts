import { z } from "zod";

import { VALIDATION_ERROR_CODES } from "@/domain/shared/error-codes";

/** Error codes exposed by the v1 API, mapped to UI states and dictionary keys by clients. */
export const PROBLEM_CODES = [
  "BAD_REQUEST",
  "VALIDATION",
  "UNAUTHENTICATED",
  "NOT_FOUND",
  "INSUFFICIENT_FUNDS",
  "NETWORK",
  "TIMEOUT",
  "UNKNOWN",
] as const;

export type ProblemCode = (typeof PROBLEM_CODES)[number];

export const ValidationIssueDtoSchema = z.object({
  field: z.string(),
  code: z.enum(VALIDATION_ERROR_CODES),
});

/** RFC 9457 Problem Details, extended with a machine-readable `code` and field `issues`. */
export const ProblemDtoSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.int(),
  code: z.enum(PROBLEM_CODES),
  issues: z.array(ValidationIssueDtoSchema).optional(),
});

export type ProblemDto = z.infer<typeof ProblemDtoSchema>;

export const PROBLEM_CONTENT_TYPE = "application/problem+json";
