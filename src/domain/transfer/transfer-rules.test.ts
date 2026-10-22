import { describe, expect, it } from "vitest";

import { money } from "../money/money";
import { validateTransferRules } from "./transfer-rules";

const recipient = { id: "contact-1", name: "Luis Pérez" };
const balance = money(10_000);

describe("validateTransferRules", () => {
  it("accepts a positive amount within the balance and a recipient", () => {
    expect(validateTransferRules({ amount: money(2_500), balance, recipient })).toEqual({
      ok: true,
      value: { amount: money(2_500), recipient },
    });
  });

  it("accepts an amount equal to the whole balance", () => {
    expect(validateTransferRules({ amount: balance, balance, recipient }).ok).toBe(true);
  });

  describe("rule 1: minimum amount", () => {
    it.each([0, -1, -10_000])("rejects %d minor units", (amount) => {
      expect(validateTransferRules({ amount: money(amount), balance, recipient })).toEqual({
        ok: false,
        error: ["AMOUNT_NOT_POSITIVE"],
      });
    });
  });

  describe("rule 2: sufficient balance", () => {
    it("rejects an amount one cent above the balance", () => {
      expect(validateTransferRules({ amount: money(10_001), balance, recipient })).toEqual({
        ok: false,
        error: ["INSUFFICIENT_FUNDS"],
      });
    });

    it("rejects any positive amount on an empty balance", () => {
      expect(validateTransferRules({ amount: money(1), balance: money(0), recipient }).ok).toBe(
        false,
      );
    });
  });

  describe("rule 3: recipient required", () => {
    it.each([null, undefined])("rejects a %s recipient", (missing) => {
      expect(validateTransferRules({ amount: money(100), balance, recipient: missing })).toEqual({
        ok: false,
        error: ["RECIPIENT_REQUIRED"],
      });
    });
  });

  it("reports all violations at once", () => {
    expect(validateTransferRules({ amount: money(0), balance, recipient: null })).toEqual({
      ok: false,
      error: ["AMOUNT_NOT_POSITIVE", "RECIPIENT_REQUIRED"],
    });
    expect(validateTransferRules({ amount: money(20_000), balance, recipient: null })).toEqual({
      ok: false,
      error: ["INSUFFICIENT_FUNDS", "RECIPIENT_REQUIRED"],
    });
  });
});
