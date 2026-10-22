import type { z } from "zod";

import type { AccountSchema } from "@/domain/account/account";
import type { MovementSchema } from "@/domain/account/movement";
import type { ContactSchema } from "@/domain/contact/contact";
import type { UserSchema } from "@/domain/user/user";

/**
 * Seed data for the in-memory adapters. Fixtures are type-checked against the schema inputs
 * (`satisfies`) and parsed again at seed time, so invalid data fails fast.
 *
 * Login identifiers:
 * - Ana López (rich history): `ana@example.com` or `55 1234 5678`
 * - Bruno Díaz (empty state, no movements nor contacts): `bruno@example.com` or `55 8765 4321`
 */
export const userFixtures = [
  { id: "usr_ana", name: "Ana López", email: "ana@example.com", phone: "+525512345678" },
  { id: "usr_bruno", name: "Bruno Díaz", email: "bruno@example.com", phone: "+525587654321" },
] as const satisfies readonly z.input<typeof UserSchema>[];

export const accountFixtures = [
  { id: "acc_ana", ownerId: "usr_ana", balance: { amount: 1_250_000, currency: "MXN" } },
  { id: "acc_bruno", ownerId: "usr_bruno", balance: { amount: 50_000, currency: "MXN" } },
] as const satisfies readonly z.input<typeof AccountSchema>[];

const ana = (
  id: string,
  type: z.input<typeof MovementSchema>["type"],
  amount: number,
  counterpartyName: string,
  createdAt: string,
): z.input<typeof MovementSchema> => ({
  id,
  accountId: "acc_ana",
  type,
  amount: { amount, currency: "MXN" },
  counterpartyName,
  createdAt,
});

export const movementFixtures = [
  ana("mov_01", "DEPOSIT", 900_000, "Nómina Acme S.A.", "2026-10-15T09:00:00.000Z"),
  ana("mov_02", "TRANSFER_OUT", 25_000, "Luis Pérez", "2026-10-16T18:20:00.000Z"),
  ana("mov_03", "TRANSFER_IN", 120_000, "Marta Ruiz", "2026-10-17T12:05:00.000Z"),
  ana("mov_04", "TRANSFER_OUT", 8_050, "Carlos Gómez", "2026-10-18T21:40:00.000Z"),
  ana("mov_05", "DEPOSIT", 300_000, "Depósito en tienda", "2026-10-19T16:15:00.000Z"),
  ana("mov_06", "TRANSFER_OUT", 45_000, "Marta Ruiz", "2026-10-20T10:30:00.000Z"),
  ana("mov_07", "TRANSFER_IN", 15_000, "Luis Pérez", "2026-10-21T08:45:00.000Z"),
] as const satisfies readonly z.input<typeof MovementSchema>[];

export const contactFixtures = [
  {
    id: "cnt_luis",
    ownerId: "usr_ana",
    name: "Luis Pérez",
    phone: "+525511112222",
    isFavorite: true,
  },
  {
    id: "cnt_marta",
    ownerId: "usr_ana",
    name: "Marta Ruiz",
    phone: "+525533334444",
    isFavorite: true,
  },
  {
    id: "cnt_carlos",
    ownerId: "usr_ana",
    name: "Carlos Gómez",
    phone: "+525555556666",
    isFavorite: false,
  },
] as const satisfies readonly z.input<typeof ContactSchema>[];
