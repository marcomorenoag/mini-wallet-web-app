import "server-only";

import { toContactDto } from "@/contracts/v1/dto";
import type { UserId } from "@/domain/user/user";
import { getRequestContext } from "@/server/request-context";

/** Data needed to open the transfer flow: the current balance and the saved contacts. */
export const loadTransferSetup = async (userId: UserId) => {
  const { useCases, simulateFault } = await getRequestContext();
  const fault = await simulateFault();
  if (fault) throw new Error(`Simulated ${fault} fault`);

  const [overview, contacts] = await Promise.all([
    useCases.getAccountOverview(userId),
    useCases.listContacts(userId),
  ]);
  if (!overview.ok) throw new Error(`Account overview unavailable: ${overview.error.kind}`);

  // DTOs, since they cross into Client Components.
  return { balance: overview.value.balance, contacts: contacts.map(toContactDto) };
};
