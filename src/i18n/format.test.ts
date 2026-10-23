import { describe, expect, it } from "vitest";

import { money } from "@/domain/money/money";

import { formatDateTime, formatMoney, formatPhone } from "./format";

describe("formatMoney", () => {
  it("formats minor units as es-MX currency", () => {
    expect(formatMoney(money(1_250_000))).toBe("$12,500.00");
    expect(formatMoney(money(8_050))).toBe("$80.50");
    expect(formatMoney(money(0))).toBe("$0.00");
  });

  it("can render the currency code", () => {
    // Intl separates the code with a non-breaking space, so the amount never wraps apart.
    expect(formatMoney(money(1_250_000), { currencyDisplay: "code" })).toBe("MXN\u00a012,500.00");
  });

  it("can always show the sign, for movement lists", () => {
    expect(formatMoney(money(120_000), { sign: "always" })).toBe("+$1,200.00");
    expect(formatMoney(money(-25_000), { sign: "always" })).toBe("-$250.00");
    expect(formatMoney(money(0), { sign: "always" })).toBe("$0.00");
  });
});

describe("formatDateTime", () => {
  // 16:42 UTC is 10:42 in Mexico City (UTC-6), regardless of the machine time zone.
  const timestamp = "2026-10-21T16:42:00.000Z";

  it("formats in the app time zone", () => {
    expect(formatDateTime(timestamp)).toBe("21 oct, 10:42");
  });

  it("supports a long style for vouchers", () => {
    expect(formatDateTime(new Date(timestamp), "long")).toBe("21 oct 2026, 10:42 a.m.");
  });
});

describe("formatPhone", () => {
  it("groups Mexican numbers and can mask the middle digits", () => {
    expect(formatPhone("+525511112222")).toBe("55 1111 2222");
    expect(formatPhone("+525511112222", { masked: true })).toBe("55 •••• 2222");
  });

  it("leaves other numbers untouched", () => {
    expect(formatPhone("+14155550100")).toBe("+14155550100");
  });
});
