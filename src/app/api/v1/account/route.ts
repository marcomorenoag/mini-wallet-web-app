import { toAccountOverviewDto } from "@/contracts/v1/dto";
import { authenticatedHandler } from "@/server/http/api-handler";
import { json, problemFromAppError } from "@/server/http/problem";

/** GET /api/v1/account — user name and available balance. */
export const GET = authenticatedHandler(async ({ user, useCases }) => {
  const result = await useCases.getAccountOverview(user.id);
  return result.ok ? json(toAccountOverviewDto(result.value)) : problemFromAppError(result.error);
});
