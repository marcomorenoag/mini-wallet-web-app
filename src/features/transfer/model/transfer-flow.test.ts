import { describe, expect, it } from "vitest";

import { money } from "@/domain/money/money";

import {
  checkAmount,
  createDraft,
  firstIncompleteStep,
  parseStep,
  selectedRecipient,
  transferFlowReducer,
} from "./transfer-flow";

const luis = { id: "cnt_luis", name: "Luis Pérez", phone: "+525511112222", isFavorite: true };
const sofia = { id: "cnt_sofia", name: "Sofía", phone: "+525522223333", isFavorite: true };
const balance = money(1_250_000);

describe("parseStep", () => {
  it("accepts known steps and defaults to amount", () => {
    expect(parseStep("summary")).toBe("summary");
    expect(parseStep(null)).toBe("amount");
    expect(parseStep("confirm")).toBe("amount");
  });
});

describe("transferFlowReducer", () => {
  it("tracks the amount and the selected recipient", () => {
    let draft = createDraft([luis], "key-1");
    draft = transferFlowReducer(draft, { type: "AMOUNT_CHANGED", input: "250" });
    draft = transferFlowReducer(draft, { type: "RECIPIENT_SELECTED", contactId: "cnt_luis" });

    expect(draft).toMatchObject({ amountInput: "250", recipientId: "cnt_luis" });
    expect(selectedRecipient(draft)).toBe(luis);
  });

  it("appends and selects a saved contact", () => {
    const draft = transferFlowReducer(createDraft([luis], "key-1"), {
      type: "CONTACT_SAVED",
      contact: sofia,
    });
    expect(draft.contacts).toEqual([luis, sofia]);
    expect(draft.recipientId).toBe("cnt_sofia");
  });

  it("starts a fresh draft with a new idempotency key on reset", () => {
    const draft = transferFlowReducer(
      { ...createDraft([luis], "key-1"), amountInput: "250", recipientId: "cnt_luis" },
      { type: "RESET", idempotencyKey: "key-2" },
    );
    expect(draft).toEqual(createDraft([luis], "key-2"));
  });
});

describe("checkAmount", () => {
  it.each([
    ["", "AMOUNT_REQUIRED"],
    ["abc", "AMOUNT_INVALID"],
    ["0", "AMOUNT_NOT_POSITIVE"],
    ["12,500.01", "INSUFFICIENT_FUNDS"],
  ])("rejects %j with %s", (input, code) => {
    expect(checkAmount(input, balance)).toEqual({ ok: false, code });
  });

  it("accepts amounts up to the balance", () => {
    expect(checkAmount("12,500", balance)).toEqual({ ok: true, amount: money(1_250_000) });
    expect(checkAmount("250.5", balance)).toEqual({ ok: true, amount: money(25_050) });
  });
});

describe("firstIncompleteStep", () => {
  it("points at the first step that still needs input", () => {
    const draft = createDraft([luis], "key-1");
    expect(firstIncompleteStep(draft, balance)).toBe("amount");
    expect(firstIncompleteStep({ ...draft, amountInput: "250" }, balance)).toBe("recipient");
    expect(
      firstIncompleteStep({ ...draft, amountInput: "250", recipientId: "cnt_luis" }, balance),
    ).toBeNull();
  });
});
