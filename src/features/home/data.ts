import "server-only";

import { MAX_MOVEMENTS_LIMIT } from "@/application/use-cases/account";
import type { UserId } from "@/domain/user/user";
import { getRequestContext } from "@/server/request-context";

/**
 * Home loaders, called by streamed Server Components. Failures are thrown, so the segment's
 * error boundary renders the error state with a retry.
 */
const withFaults = async () => {
  const context = await getRequestContext();
  const fault = await context.simulateFault();
  if (fault) throw new Error(`Simulated ${fault} fault`);
  return context.useCases;
};

export const loadAccountOverview = async (userId: UserId) => {
  const result = await (await withFaults()).getAccountOverview(userId);
  if (!result.ok) throw new Error(`Account overview unavailable: ${result.error.kind}`);
  return result.value;
};

/** The whole history is listed, up to the use case's upper bound. */
export const loadMovements = async (userId: UserId) => {
  const result = await (await withFaults()).listMovements(userId, { limit: MAX_MOVEMENTS_LIMIT });
  if (!result.ok) throw new Error(`Movements unavailable: ${result.error.kind}`);
  return result.value;
};
