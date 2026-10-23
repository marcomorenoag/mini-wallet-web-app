import { toTransferOutcomeDto } from "@/contracts/v1/dto";
import { IDEMPOTENCY_KEY_HEADER } from "@/contracts/v1/requests";
import type { TransferOutcome } from "@/domain/transfer/transfer";
import { authenticatedHandler } from "@/server/http/api-handler";
import { json, problem, problemFromAppError } from "@/server/http/problem";
import { readJson } from "@/server/http/read-json";

/** HTTP status of each successful outcome; a failed one is answered with its problem details. */
const OUTCOME_STATUS = {
  COMPLETED: 201,
  PENDING: 202,
} as const satisfies Record<Exclude<TransferOutcome["status"], "FAILED">, number>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * POST /api/v1/transfers — confirms a transfer. The `Idempotency-Key` header is required and must
 * be reused on retries. Outcomes map to HTTP statuses: 201 completed, 202 pending, 422 insufficient
 * funds, 503 network error, 504 timeout, 500 unknown error.
 */
export const POST = authenticatedHandler(
  async ({ request, user, useCases }) => {
    const body = await readJson(request);
    if (!body.ok || !isRecord(body.value)) return problem("BAD_REQUEST");

    const result = await useCases.createTransfer(user.id, {
      ...body.value,
      idempotencyKey: request.headers.get(IDEMPOTENCY_KEY_HEADER) ?? undefined,
    });
    if (!result.ok) return problemFromAppError(result.error);

    const outcome = result.value;
    if (outcome.status === "FAILED") return problem(outcome.code);
    return json(toTransferOutcomeDto(outcome), { status: OUTCOME_STATUS[outcome.status] });
  },
  // The scenario drives the payment network outcome instead of failing the request upfront.
  { simulateFaults: false },
);

/**
 * GET /api/v1/transfers?idempotencyKey=… — outcome of a confirmation, used to recover the result
 * after a client-side timeout. Always 200 when the key is known, with the outcome in the body.
 */
export const GET = authenticatedHandler(
  async ({ request, user, useCases }) => {
    const result = await useCases.getTransferStatus(
      user.id,
      request.nextUrl.searchParams.get("idempotencyKey"),
    );
    return result.ok ? json(toTransferOutcomeDto(result.value)) : problemFromAppError(result.error);
  },
  // Part of the confirmation flow: a forced scenario describes the payment, not this lookup.
  { simulateFaults: false },
);
