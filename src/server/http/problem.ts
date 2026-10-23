import "server-only";

import { NextResponse } from "next/server";

import type { AppError } from "@/application/errors";
import { PROBLEM_CONTENT_TYPE, type ProblemCode, type ProblemDto } from "@/contracts/v1/problem";
import type { ValidationIssue } from "@/domain/shared/validation";

const PROBLEMS: Record<ProblemCode, { readonly status: number; readonly title: string }> = {
  BAD_REQUEST: { status: 400, title: "Malformed request" },
  VALIDATION: { status: 422, title: "Validation failed" },
  UNAUTHENTICATED: { status: 401, title: "Authentication required" },
  NOT_FOUND: { status: 404, title: "Resource not found" },
  INSUFFICIENT_FUNDS: { status: 422, title: "Insufficient funds" },
  NETWORK: { status: 503, title: "Payment network unavailable" },
  TIMEOUT: { status: 504, title: "Payment network timed out" },
  UNKNOWN: { status: 500, title: "Unexpected error" },
};

export const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export const problem = (
  code: ProblemCode,
  issues?: readonly ValidationIssue[],
): NextResponse<ProblemDto> => {
  const { status, title } = PROBLEMS[code];
  const body: ProblemDto = {
    type: `about:blank#${code.toLowerCase()}`,
    title,
    status,
    code,
    ...(issues ? { issues: [...issues] } : {}),
  };
  return NextResponse.json(body, {
    status,
    headers: { ...NO_STORE_HEADERS, "Content-Type": PROBLEM_CONTENT_TYPE },
  });
};

/**
 * Problem code of each application error. The application layer knows nothing about HTTP, so the
 * translation lives here; a new error kind fails to compile until it is mapped.
 */
const APP_ERROR_PROBLEMS: Record<AppError["kind"], ProblemCode> = {
  VALIDATION: "VALIDATION",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  NOT_FOUND: "NOT_FOUND",
};

export const problemFromAppError = (error: AppError): NextResponse<ProblemDto> =>
  problem(APP_ERROR_PROBLEMS[error.kind], error.kind === "VALIDATION" ? error.issues : undefined);

export const json = <T>(body: T, init: { status?: number } = {}): NextResponse<T> =>
  NextResponse.json(body, { status: init.status ?? 200, headers: NO_STORE_HEADERS });
