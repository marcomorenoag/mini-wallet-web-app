import { toMajorUnits, type Money } from "@/domain/money/money";

import { DEFAULT_LOCALE, TIME_ZONE, type Locale } from "./config";

/**
 * Locale-aware formatters shared by Server and Client Components. Intl formatters are costly to
 * build, so they are cached per locale and option set.
 */
const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

const cached = <F>(cache: Map<string, F>, key: string, create: () => F): F => {
  const existing = cache.get(key);
  if (existing) return existing;
  const formatter = create();
  cache.set(key, formatter);
  return formatter;
};

export interface MoneyFormatOptions {
  /** `"always"` prefixes credits with "+" (movement lists); defaults to the plain amount. */
  readonly sign?: "auto" | "always";
  /** `"code"` renders the ISO code (e.g. "MXN 12,500.00") to disambiguate the "$" symbol. */
  readonly currencyDisplay?: "symbol" | "code";
  readonly locale?: Locale;
}

/** Formats integer minor units as currency, e.g. `{ amount: 1_250_000 }` → "$12,500.00". */
export const formatMoney = (
  value: Money,
  { sign = "auto", currencyDisplay = "symbol", locale = DEFAULT_LOCALE }: MoneyFormatOptions = {},
): string =>
  cached(
    numberFormatters,
    `${locale}|${value.currency}|${sign}|${currencyDisplay}`,
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: value.currency,
        currencyDisplay,
        signDisplay: sign === "always" ? "exceptZero" : "auto",
      }),
  ).format(toMajorUnits(value));

const DATE_TIME_STYLES = {
  /** "21 oct, 10:42": compact, for lists. */
  short: { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" },
  /** "21 oct 2026, 10:42 a.m.": complete, for vouchers. */
  long: { dateStyle: "medium", timeStyle: "short" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateTimeStyle = keyof typeof DATE_TIME_STYLES;

/** Formats an ISO timestamp in the app time zone. */
export const formatDateTime = (
  value: string | Date,
  style: DateTimeStyle = "short",
  locale: Locale = DEFAULT_LOCALE,
): string =>
  cached(
    dateTimeFormatters,
    `${locale}|${style}`,
    () => new Intl.DateTimeFormat(locale, { ...DATE_TIME_STYLES[style], timeZone: TIME_ZONE }),
  ).format(typeof value === "string" ? new Date(value) : value);
