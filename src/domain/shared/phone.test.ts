import { describe, expect, it } from "vitest";

import { MxPhoneSchema, normalizeMxPhone } from "./phone";

describe("normalizeMxPhone", () => {
  it.each([
    ["5512345678", "+525512345678"],
    ["55 1234 5678", "+525512345678"],
    ["55-1234-5678", "+525512345678"],
    ["(55) 1234.5678", "+525512345678"],
    ["+52 55 1234 5678", "+525512345678"],
    ["525512345678", "+525512345678"],
  ])("normalizes %j to E.164", (input, expected) => {
    expect(normalizeMxPhone(input)).toBe(expected);
  });

  it.each(["", "12345", "55123456789", "+1 555 123 4567", "55a2345678"])("rejects %j", (input) => {
    expect(normalizeMxPhone(input)).toBeNull();
  });
});

describe("MxPhoneSchema", () => {
  it("outputs the normalized phone", () => {
    expect(MxPhoneSchema.parse(" 55 1234 5678 ")).toBe("+525512345678");
  });

  it.each([
    ["", "PHONE_REQUIRED"],
    [undefined, "PHONE_REQUIRED"],
    ["123", "PHONE_INVALID"],
  ])("reports %j as %s", (input, code) => {
    const result = MxPhoneSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(code);
  });
});
