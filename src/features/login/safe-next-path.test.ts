import { describe, expect, it } from "vitest";

import { safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it.each([
    ["/home", "/home"],
    ["/transfer?step=amount", "/transfer?step=amount"],
    ["/voucher/trf_1#details", "/voucher/trf_1#details"],
  ])("keeps the internal path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    [null],
    [""],
    ["home"],
    ["https://evil.example/home"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["/login"],
    ["/login?next=/home"],
  ])("falls back to home for %s", (input) => {
    expect(safeNextPath(input)).toBe("/home");
  });
});
