import { describe, expect, it } from "vitest";

import { LoginIdentifierSchema, LoginInputSchema } from "./login-identifier";

describe("LoginIdentifierSchema", () => {
  it("accepts and lower-cases an email", () => {
    expect(LoginIdentifierSchema.parse("  Ana.Lopez@Example.com ")).toEqual({
      type: "email",
      value: "ana.lopez@example.com",
    });
  });

  it("accepts and normalizes a phone number", () => {
    expect(LoginIdentifierSchema.parse("55 1234 5678")).toEqual({
      type: "phone",
      value: "+525512345678",
    });
  });

  it.each([
    ["", "IDENTIFIER_REQUIRED"],
    ["   ", "IDENTIFIER_REQUIRED"],
    [undefined, "IDENTIFIER_REQUIRED"],
    ["ana@", "IDENTIFIER_INVALID"],
    ["ana@example", "IDENTIFIER_INVALID"],
    ["12345", "IDENTIFIER_INVALID"],
    ["not an identifier", "IDENTIFIER_INVALID"],
  ])("reports %j as %s", (input, code) => {
    const result = LoginIdentifierSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(code);
  });
});

describe("LoginInputSchema", () => {
  it("reports issues on the identifier field", () => {
    const result = LoginInputSchema.safeParse({ identifier: "" });
    expect(result.error?.issues[0]?.path).toEqual(["identifier"]);
  });
});
