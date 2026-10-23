import "server-only";

import { notFound } from "next/navigation";

import type { UserId } from "@/domain/user/user";
import { getRequestContext } from "@/server/request-context";

/** Completed transfer of the current user; any other id (or another user's) is a 404. */
export const loadVoucher = async (userId: UserId, transferId: string) => {
  const { useCases, simulateFault } = await getRequestContext();
  const fault = await simulateFault();
  if (fault) throw new Error(`Simulated ${fault} fault`);

  const result = await useCases.getTransfer(userId, transferId);
  if (!result.ok) notFound();
  return result.value;
};
