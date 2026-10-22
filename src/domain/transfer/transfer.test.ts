import { describe, expect, it } from "vitest";

import { money } from "../money/money";
import { toValidationIssues } from "../shared/validation";
import { TransferDraftSchema } from "./transfer";

const idempotencyKey = "0b9f1f0e-3c1a-4d8e-9a57-2f6d1c3b8e41";

describe("TransferDraftSchema", () => {
  it("accepts a well-formed draft", () => {
    const draft = { amount: money(2_500), recipientId: "contact-1", idempotencyKey };
    expect(TransferDraftSchema.parse(draft)).toEqual(draft);
  });

  it("requires a recipient", () => {
    for (const recipientId of [undefined, ""]) {
      const result = TransferDraftSchema.safeParse({
        amount: money(2_500),
        recipientId,
        idempotencyKey,
      });
      if (result.success) throw new Error("Expected a validation error");
      expect(toValidationIssues(result.error)).toEqual([
        { field: "recipientId", code: "RECIPIENT_REQUIRED" },
      ]);
    }
  });

  it("rejects fractional minor units and malformed idempotency keys", () => {
    const result = TransferDraftSchema.safeParse({
      amount: { amount: 10.5, currency: "MXN" },
      recipientId: "contact-1",
      idempotencyKey: "not-a-uuid",
    });
    if (result.success) throw new Error("Expected a validation error");
    expect(toValidationIssues(result.error)).toEqual([
      { field: "amount.amount", code: "AMOUNT_INVALID" },
      { field: "idempotencyKey", code: "INVALID" },
    ]);
  });
});
