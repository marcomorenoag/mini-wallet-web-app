import { describe, expect, it } from "vitest";

import {
  add,
  compare,
  CurrencyMismatchError,
  isGreaterThan,
  isPositive,
  money,
  type Money,
  parseMajorUnits,
  subtract,
  toMajorUnits,
  zero,
} from "./money";

describe("money", () => {
  it("creates MXN amounts in minor units by default", () => {
    expect(money(12_550)).toEqual({ amount: 12_550, currency: "MXN" });
    expect(zero()).toEqual({ amount: 0, currency: "MXN" });
  });

  it("rejects non-integer minor units", () => {
    expect(() => money(10.5)).toThrow();
  });

  it("adds and subtracts without floating-point drift", () => {
    expect(add(money(10), money(20))).toEqual(money(30));
    expect(subtract(money(30), money(10))).toEqual(money(20));
    expect(subtract(money(10), money(30))).toEqual(money(-20));
  });

  it("compares amounts", () => {
    expect(compare(money(1), money(2))).toBeLessThan(0);
    expect(compare(money(2), money(2))).toBe(0);
    expect(isGreaterThan(money(3), money(2))).toBe(true);
    expect(isGreaterThan(money(2), money(2))).toBe(false);
  });

  it("detects positive amounts", () => {
    expect(isPositive(money(1))).toBe(true);
    expect(isPositive(money(0))).toBe(false);
    expect(isPositive(money(-1))).toBe(false);
  });

  it("throws when currencies differ", () => {
    // A second currency is simulated, since only MXN is supported.
    const usd = { amount: 100, currency: "USD" } as unknown as Money;
    expect(() => add(money(100), usd)).toThrow(CurrencyMismatchError);
  });

  it("converts to major units for display", () => {
    expect(toMajorUnits(money(12_550))).toBe(125.5);
  });
});

describe("parseMajorUnits", () => {
  it.each([
    ["250", 25_000],
    ["250.5", 25_050],
    ["250.50", 25_050],
    ["0.01", 1],
    ["1,250.75", 125_075],
    ["  10  ", 1_000],
    ["10.", 1_000],
    ["0", 0],
    ["-0", 0],
    ["-15.5", -1_550],
  ])("parses %j into %d minor units", (input, expected) => {
    expect(parseMajorUnits(input)).toEqual({ ok: true, value: money(expected) });
  });

  it("parses decimals exactly, where floats would drift", () => {
    // 0.1 + 0.2 !== 0.3 in floating point; minor units keep it exact.
    const a = parseMajorUnits("0.1");
    const b = parseMajorUnits("0.2");
    if (!a.ok || !b.ok) throw new Error("Expected valid amounts");
    expect(add(a.value, b.value)).toEqual(money(30));
  });

  it("reports an empty amount as required", () => {
    expect(parseMajorUnits("   ")).toEqual({ ok: false, error: "AMOUNT_REQUIRED" });
  });

  it.each(["abc", "1.234", "1e3", "12.3.4", ".5", "$10", "Infinity", "99999999999999999999"])(
    "rejects %j as invalid",
    (input) => {
      expect(parseMajorUnits(input)).toEqual({ ok: false, error: "AMOUNT_INVALID" });
    },
  );
});
