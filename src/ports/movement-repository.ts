import type { AccountId } from "@/domain/account/account";
import type { Movement } from "@/domain/account/movement";

export interface ListMovementsOptions {
  readonly limit: number;
}

export interface MovementRepository {
  /** Most recent movements first. */
  listByAccountId(
    accountId: AccountId,
    options: ListMovementsOptions,
  ): Promise<readonly Movement[]>;
}
