import { ROUTES } from "@/lib/routes";

const INTERNAL_ORIGIN = "http://internal.invalid";

/**
 * Validates the `next` destination kept by the proxy, so it cannot be abused as an open redirect
 * (`//evil.com`, `/\evil.com`, absolute URLs). Anything else falls back to Home.
 */
export const safeNextPath = (value: unknown): string => {
  if (typeof value !== "string" || !value.startsWith("/") || /^\/[/\\]/.test(value)) {
    return ROUTES.home;
  }
  try {
    const url = new URL(value, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN || url.pathname === ROUTES.login) return ROUTES.home;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return ROUTES.home;
  }
};
