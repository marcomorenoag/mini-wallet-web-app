import type { z } from "zod";

import { ContactDtoSchema, TransferOutcomeDtoSchema } from "@/contracts/v1/dto";
import { ProblemDtoSchema, type ProblemCode } from "@/contracts/v1/problem";
import {
  API_V1_BASE_PATH,
  type CreateContactRequest,
  type CreateTransferRequest,
  IDEMPOTENCY_KEY_HEADER,
} from "@/contracts/v1/requests";
import type { ValidationIssue } from "@/domain/shared/validation";

/** Browser-side client of the v1 API: responses are validated against the versioned contracts. */
export type ApiResult<T> =
  | { readonly ok: true; readonly status: number; readonly data: T }
  | { readonly ok: false; readonly code: ProblemCode; readonly issues: readonly ValidationIssue[] };

const failure = (code: ProblemCode, issues: readonly ValidationIssue[] = []) =>
  ({ ok: false, code, issues }) as const;

const request = async <S extends z.ZodType>(
  path: string,
  init: RequestInit,
  schema: S,
): Promise<ApiResult<z.infer<S>>> => {
  let response: Response;
  try {
    response = await fetch(`${API_V1_BASE_PATH}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch (error) {
    // An abort is the caller's decision (e.g. its own timeout); anything else is connectivity.
    if (init.signal?.aborted) throw error;
    return failure("NETWORK");
  }

  const body: unknown = await response.json().catch(() => null);
  if (response.ok) {
    const parsed = schema.safeParse(body);
    return parsed.success
      ? { ok: true, status: response.status, data: parsed.data }
      : failure("UNKNOWN");
  }
  const problem = ProblemDtoSchema.safeParse(body);
  return problem.success ? failure(problem.data.code, problem.data.issues) : failure("UNKNOWN");
};

export const createContact = (input: CreateContactRequest) =>
  request("/contacts", { method: "POST", body: JSON.stringify(input) }, ContactDtoSchema);

/** The same idempotency key must be sent on every retry of the same transfer. */
export const createTransfer = (
  input: CreateTransferRequest,
  idempotencyKey: string,
  { signal }: { readonly signal?: AbortSignal } = {},
) =>
  request(
    "/transfers",
    {
      method: "POST",
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
      body: JSON.stringify(input),
      ...(signal ? { signal } : {}),
    },
    TransferOutcomeDtoSchema,
  );

/** Outcome of a confirmation by idempotency key, used to recover it after a client timeout. */
export const getTransferStatus = (idempotencyKey: string) =>
  request(
    `/transfers?idempotencyKey=${encodeURIComponent(idempotencyKey)}`,
    { method: "GET" },
    TransferOutcomeDtoSchema,
  );
