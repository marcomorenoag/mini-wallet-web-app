import { describe, expect, it } from "vitest";

import { toValidationIssues } from "../shared/validation";
import { CONTACT_NAME_MAX_LENGTH, NewContactInputSchema } from "./contact";

describe("NewContactInputSchema", () => {
  it("trims the name, normalizes the phone and marks the contact as favorite by default", () => {
    expect(NewContactInputSchema.parse({ name: "  Luis Pérez ", phone: "55 1234 5678" })).toEqual({
      name: "Luis Pérez",
      phone: "+525512345678",
      isFavorite: true,
    });
  });

  it("keeps an explicit favorite flag", () => {
    const contact = NewContactInputSchema.parse({
      name: "Luis",
      phone: "5512345678",
      isFavorite: false,
    });
    expect(contact.isFavorite).toBe(false);
  });

  it("reports every invalid field with its code", () => {
    const result = NewContactInputSchema.safeParse({ name: " ", phone: "123" });
    if (result.success) throw new Error("Expected a validation error");

    expect(toValidationIssues(result.error)).toEqual([
      { field: "name", code: "CONTACT_NAME_REQUIRED" },
      { field: "phone", code: "PHONE_INVALID" },
    ]);
  });

  it("rejects names longer than the limit", () => {
    const result = NewContactInputSchema.safeParse({
      name: "a".repeat(CONTACT_NAME_MAX_LENGTH + 1),
      phone: "5512345678",
    });
    expect(result.error?.issues[0]?.message).toBe("CONTACT_NAME_TOO_LONG");
  });
});
