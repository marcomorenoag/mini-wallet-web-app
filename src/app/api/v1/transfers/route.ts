import { toTransferOutcomeDto } from "@/contracts/v1/dto";
import { IDEMPOTENCY_KEY_HEADER } from "@/contracts/v1/requests";
import { authenticatedHandler } from "@/server/http/api-handler";
import { json, problem, problemFromAppError } from "@/server/http/problem";
import { readJson } from "@/server/http/read-json";

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
    switch (outcome.status) {
      case "COMPLETED":
        return json(toTransferOutcomeDto(outcome), { status: 201 });
      case "PENDING":
        return json(toTransferOutcomeDto(outcome), { status: 202 });
      case "FAILED":
        return problem(outcome.code);
    }
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
