import type { ProblemCode } from "@/contracts/v1/problem";
import type { ValidationErrorCode } from "@/domain/shared/error-codes";

/** Result of a login attempt, rendered by the form; a success redirects instead. */
export interface LoginFormState {
  /** Submitted value, echoed back so it survives a full-page (no-JS) round trip. */
  readonly identifier: string;
  /** Shown inline under the field. */
  readonly fieldError?: ValidationErrorCode;
  /** Shown as a banner (e.g. a simulated network failure). */
  readonly problem?: ProblemCode;
}

export const INITIAL_LOGIN_STATE: LoginFormState = { identifier: "" };
