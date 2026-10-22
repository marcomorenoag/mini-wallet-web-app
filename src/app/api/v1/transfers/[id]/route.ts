import { toTransferDto } from "@/contracts/v1/dto";
import { authenticatedHandler } from "@/server/http/api-handler";
import { json, problemFromAppError } from "@/server/http/problem";

/** GET /api/v1/transfers/{id} — completed transfer for the voucher, scoped to its owner. */
export const GET = authenticatedHandler<{ id: string }>(async ({ params, user, useCases }) => {
  const result = await useCases.getTransfer(user.id, params.id);
  return result.ok ? json(toTransferDto(result.value)) : problemFromAppError(result.error);
});
