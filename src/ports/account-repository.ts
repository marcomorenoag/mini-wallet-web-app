import type { Account } from "@/domain/account/account";
import type { UserId } from "@/domain/user/user";

export interface AccountRepository {
  /** Every query is scoped to its owner, so a user can only reach their own account. */
  findByOwnerId(ownerId: UserId): Promise<Account | null>;
}
