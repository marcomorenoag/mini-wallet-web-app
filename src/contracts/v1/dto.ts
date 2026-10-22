import { z } from "zod";

import type { Account } from "@/domain/account/account";
import { MOVEMENT_TYPES, type Movement } from "@/domain/account/movement";
import type { Contact } from "@/domain/contact/contact";
import { CURRENCIES, type Money } from "@/domain/money/money";
import { TRANSFER_FAILURE_CODES } from "@/domain/shared/error-codes";
import type { Transfer, TransferOutcome } from "@/domain/transfer/transfer";
import type { User } from "@/domain/user/user";

/*
 * v1 response contracts. Domain types never leak to the wire: brands are dropped, and fields are
 * listed explicitly, so a domain change cannot silently change the public API. Clients parse
 * responses with these schemas.
 */

export const MoneyDtoSchema = z.object({ amount: z.int(), currency: z.enum(CURRENCIES) });
export type MoneyDto = z.infer<typeof MoneyDtoSchema>;

export const SessionUserDtoSchema = z.object({ id: z.string(), name: z.string() });
export type SessionUserDto = z.infer<typeof SessionUserDtoSchema>;

export const AccountOverviewDtoSchema = z.object({
  userName: z.string(),
  balance: MoneyDtoSchema,
});
export type AccountOverviewDto = z.infer<typeof AccountOverviewDtoSchema>;

export const MovementDtoSchema = z.object({
  id: z.string(),
  type: z.enum(MOVEMENT_TYPES),
  amount: MoneyDtoSchema,
  counterpartyName: z.string(),
  createdAt: z.iso.datetime(),
});
export type MovementDto = z.infer<typeof MovementDtoSchema>;

export const MovementListDtoSchema = z.object({ items: z.array(MovementDtoSchema) });
export type MovementListDto = z.infer<typeof MovementListDtoSchema>;

export const ContactDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  isFavorite: z.boolean(),
});
export type ContactDto = z.infer<typeof ContactDtoSchema>;

export const ContactListDtoSchema = z.object({ items: z.array(ContactDtoSchema) });
export type ContactListDto = z.infer<typeof ContactListDtoSchema>;

export const TransferDtoSchema = z.object({
  id: z.string(),
  idempotencyKey: z.string(),
  recipient: z.object({ contactId: z.string(), name: z.string(), phone: z.string() }),
  amount: MoneyDtoSchema,
  createdAt: z.iso.datetime(),
});
export type TransferDto = z.infer<typeof TransferDtoSchema>;

export const TransferOutcomeDtoSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("COMPLETED"), transfer: TransferDtoSchema }),
  z.object({ status: z.literal("FAILED"), code: z.enum(TRANSFER_FAILURE_CODES) }),
  z.object({ status: z.literal("PENDING") }),
]);
export type TransferOutcomeDto = z.infer<typeof TransferOutcomeDtoSchema>;

export const toMoneyDto = ({ amount, currency }: Money): MoneyDto => ({ amount, currency });

export const toSessionUserDto = ({ id, name }: User): SessionUserDto => ({ id, name });

export const toAccountOverviewDto = (overview: {
  readonly userName: string;
  readonly balance: Account["balance"];
}): AccountOverviewDto => ({
  userName: overview.userName,
  balance: toMoneyDto(overview.balance),
});

export const toMovementDto = (movement: Movement): MovementDto => ({
  id: movement.id,
  type: movement.type,
  amount: toMoneyDto(movement.amount),
  counterpartyName: movement.counterpartyName,
  createdAt: movement.createdAt,
});

export const toContactDto = ({ id, name, phone, isFavorite }: Contact): ContactDto => ({
  id,
  name,
  phone,
  isFavorite,
});

export const toTransferDto = (transfer: Transfer): TransferDto => ({
  id: transfer.id,
  idempotencyKey: transfer.idempotencyKey,
  recipient: {
    contactId: transfer.recipient.contactId,
    name: transfer.recipient.name,
    phone: transfer.recipient.phone,
  },
  amount: toMoneyDto(transfer.amount),
  createdAt: transfer.createdAt,
});

export const toTransferOutcomeDto = (outcome: TransferOutcome): TransferOutcomeDto => {
  switch (outcome.status) {
    case "COMPLETED":
      return { status: "COMPLETED", transfer: toTransferDto(outcome.transfer) };
    case "FAILED":
      return { status: "FAILED", code: outcome.code };
    case "PENDING":
      return { status: "PENDING" };
  }
};
