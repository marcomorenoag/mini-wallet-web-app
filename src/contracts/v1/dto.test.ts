import { describe, expect, it } from "vitest";

import { createMockDatabase } from "@/adapters/mock/mock-database";
import { money } from "@/domain/money/money";
import { TransferSchema } from "@/domain/transfer/transfer";

import {
  ContactDtoSchema,
  MovementDtoSchema,
  toContactDto,
  toMovementDto,
  toTransferOutcomeDto,
  TransferOutcomeDtoSchema,
} from "./dto";

const transfer = TransferSchema.parse({
  id: "trf_1",
  idempotencyKey: "0b9f1f0e-3c1a-4d8e-9a57-2f6d1c3b8e41",
  accountId: "acc_ana",
  recipient: { contactId: "cnt_luis", name: "Luis Pérez", phone: "+525511112222" },
  amount: money(25_000),
  createdAt: "2026-10-22T12:00:00.000Z",
});

describe("v1 DTO mappers", () => {
  it("produce payloads that satisfy the published schemas", () => {
    const db = createMockDatabase();
    for (const movement of db.movements) {
      expect(MovementDtoSchema.safeParse(toMovementDto(movement)).success).toBe(true);
    }
    for (const contact of db.contacts) {
      expect(ContactDtoSchema.safeParse(toContactDto(contact)).success).toBe(true);
    }
  });

  it("do not leak internal fields to the wire", () => {
    const [contact] = createMockDatabase().contacts;
    if (!contact) throw new Error("Expected a contact fixture");
    expect(Object.keys(toContactDto(contact)).sort()).toEqual([
      "id",
      "isFavorite",
      "name",
      "phone",
    ]);

    const outcome = toTransferOutcomeDto({ status: "COMPLETED", transfer });
    expect(outcome).not.toHaveProperty("transfer.accountId");
  });

  it.each([
    { status: "COMPLETED", transfer } as const,
    { status: "FAILED", code: "NETWORK" } as const,
    { status: "PENDING" } as const,
  ])("maps the $status outcome", (outcome) => {
    expect(TransferOutcomeDtoSchema.safeParse(toTransferOutcomeDto(outcome)).success).toBe(true);
  });
});
