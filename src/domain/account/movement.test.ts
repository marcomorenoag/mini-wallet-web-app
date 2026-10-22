import { describe, expect, it } from "vitest";

import { money } from "../money/money";
import { isCredit, MovementSchema, signedAmount } from "./movement";

describe("movement", () => {
  it.each([
    ["DEPOSIT", true],
    ["TRANSFER_IN", true],
    ["TRANSFER_OUT", false],
  ] as const)("classifies %s as credit=%s", (type, expected) => {
    expect(isCredit({ type })).toBe(expected);
  });

  it("signs the amount by direction", () => {
    expect(signedAmount({ type: "DEPOSIT", amount: money(500) })).toEqual(money(500));
    expect(signedAmount({ type: "TRANSFER_OUT", amount: money(500) })).toEqual(money(-500));
  });

  it("requires a positive amount", () => {
    const result = MovementSchema.safeParse({
      id: "mov-1",
      accountId: "acc-1",
      type: "DEPOSIT",
      amount: money(0),
      counterpartyName: "Marta",
      createdAt: "2026-10-21T10:42:00.000Z",
    });
    expect(result.error?.issues[0]?.message).toBe("AMOUNT_NOT_POSITIVE");
  });
});
