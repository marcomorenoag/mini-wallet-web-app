/** Supported locales; a single one for now, so no locale segment is added to the URLs. */
export const LOCALES = ["es-MX"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es-MX";

/** Dates are rendered in a fixed zone, so server and client output match during hydration. */
export const TIME_ZONE = "America/Mexico_City";
