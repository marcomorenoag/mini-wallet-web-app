import { toMovementDto } from "@/contracts/v1/dto";
import { authenticatedHandler } from "@/server/http/api-handler";
import { json, problemFromAppError } from "@/server/http/problem";

/** GET /api/v1/account/movements?limit=20 — recent movements, newest first. */
export const GET = authenticatedHandler(async ({ request, user, useCases }) => {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? undefined);
  const result = await useCases.listMovements(
    user.id,
    Number.isFinite(limit) ? { limit } : undefined,
  );
  return result.ok
    ? json({ items: result.value.map(toMovementDto) })
    : problemFromAppError(result.error);
});
