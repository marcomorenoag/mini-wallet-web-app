import { z } from "zod";

import { MoneySchema } from "../money/money";
import { UserIdSchema } from "../user/user";

export const AccountIdSchema = z.string().min(1).brand<"AccountId">();
export type AccountId = z.infer<typeof AccountIdSchema>;

export const AccountSchema = z
  .object({
    id: AccountIdSchema,
    ownerId: UserIdSchema,
    balance: MoneySchema,
  })
  .readonly();

export type Account = z.infer<typeof AccountSchema>;
