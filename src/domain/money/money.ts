import { z } from "zod";

import { err, ok, type Result } from "../shared/result";
import type { ValidationErrorCode } from "../shared/error-codes";

export const CURRENCIES = ["MXN"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = "MXN";

/** Number of minor-unit digits per currency (ISO 4217 exponent). */
const MINOR_UNIT_DIGITS: Record<Currency, number> = { MXN: 2 };

export const CurrencySchema = z.enum(CURRENCIES);

/**
 * Money is stored as an integer amount of minor units (cents) plus its currency.
 * Floating-point arithmetic is never used on amounts, so rounding errors cannot corrupt balances.
 */
export const MoneySchema = z
  .object({
    amount: z.int({ error: "AMOUNT_INVALID" }),
    currency: CurrencySchema,
  })
  .readonly();

export type Money = z.infer<typeof MoneySchema>;

export class CurrencyMismatchError extends Error {
  constructor(a: Currency, b: Currency) {
    super(`Currency mismatch: ${a} vs ${b}`);
    this.name = "CurrencyMismatchError";
  }
}

export const money = (amount: number, currency: Currency = DEFAULT_CURRENCY): Money =>
  MoneySchema.parse({ amount, currency });

export const zero = (currency: Currency = DEFAULT_CURRENCY): Money => money(0, currency);

const assertSameCurrency = (a: Money, b: Money): void => {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency);
};

export const add = (a: Money, b: Money): Money => {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
};

export const subtract = (a: Money, b: Money): Money => {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
};

/** Negative when `a < b`, zero when equal, positive when `a > b`. */
export const compare = (a: Money, b: Money): number => {
  assertSameCurrency(a, b);
  return a.amount - b.amount;
};

export const isPositive = (value: Money): boolean => value.amount > 0;

export const isGreaterThan = (a: Money, b: Money): boolean => compare(a, b) > 0;

/** Major units as a number, intended only for display/formatting (e.g. `Intl.NumberFormat`). */
export const toMajorUnits = (value: Money): number =>
  value.amount / 10 ** MINOR_UNIT_DIGITS[value.currency];

const THOUSANDS_SEPARATOR = /,/g;

/**
 * Parses user input in major units (e.g. `"1,250.50"`) into Money without going through floats.
 * Negative values are parsed on purpose, so the "amount must be positive" rule can report them.
 */
export const parseMajorUnits = (
  input: string,
  currency: Currency = DEFAULT_CURRENCY,
): Result<Money, ValidationErrorCode> => {
  const value = input.trim().replace(THOUSANDS_SEPARATOR, "");
  if (value === "") return err("AMOUNT_REQUIRED");

  const digits = MINOR_UNIT_DIGITS[currency];
  const match = new RegExp(`^(-)?(\\d+)(?:\\.(\\d{0,${digits}}))?$`).exec(value);
  if (!match) return err("AMOUNT_INVALID");

  const [, sign, whole = "0", fraction = ""] = match;
  const minorUnits = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, "0"));
  if (!Number.isSafeInteger(minorUnits)) return err("AMOUNT_INVALID");

  // `-0` is avoided so that zero is always represented the same way.
  return ok(money(sign && minorUnits !== 0 ? -minorUnits : minorUnits, currency));
};
