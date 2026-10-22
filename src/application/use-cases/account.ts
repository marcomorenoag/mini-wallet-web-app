import type { Movement } from "@/domain/account/movement";
import type { Money } from "@/domain/money/money";
import { err, ok, type Result } from "@/domain/shared/result";
import type { UserId } from "@/domain/user/user";
import type { AccountRepository } from "@/ports/account-repository";
import type { MovementRepository } from "@/ports/movement-repository";
import type { UserRepository } from "@/ports/user-repository";

import { type AppError, NOT_FOUND } from "../errors";

export const DEFAULT_MOVEMENTS_LIMIT = 20;
export const MAX_MOVEMENTS_LIMIT = 100;

export interface AccountOverview {
  readonly userName: string;
  readonly balance: Money;
}

export const makeGetAccountOverview =
  ({ users, accounts }: { users: UserRepository; accounts: AccountRepository }) =>
  async (userId: UserId): Promise<Result<AccountOverview, AppError>> => {
    const [user, account] = await Promise.all([
      users.findById(userId),
      accounts.findByOwnerId(userId),
    ]);
    if (!user || !account) return err(NOT_FOUND);

    return ok({ userName: user.name, balance: account.balance });
  };

export const makeListMovements =
  ({ accounts, movements }: { accounts: AccountRepository; movements: MovementRepository }) =>
  async (
    userId: UserId,
    { limit = DEFAULT_MOVEMENTS_LIMIT }: { limit?: number } = {},
  ): Promise<Result<readonly Movement[], AppError>> => {
    const account = await accounts.findByOwnerId(userId);
    if (!account) return err(NOT_FOUND);

    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), MAX_MOVEMENTS_LIMIT);
    return ok(await movements.listByAccountId(account.id, { limit: safeLimit }));
  };
