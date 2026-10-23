import { afterEach, describe, expect, it, vi } from "vitest";

import { isSessionCookieSecure } from "./session-cookie";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isSessionCookieSecure", () => {
  it("is secure in production by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_COOKIE_SECURE", "");
    expect(isSessionCookieSecure()).toBe(true);
  });

  it("is not secure in development, which runs over plain HTTP", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SESSION_COOKIE_SECURE", "");
    expect(isSessionCookieSecure()).toBe(false);
  });

  it("can be turned off for a production build served over plain HTTP (E2E)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_COOKIE_SECURE", "false");
    expect(isSessionCookieSecure()).toBe(false);
  });

  it("can be forced on outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SESSION_COOKIE_SECURE", "true");
    expect(isSessionCookieSecure()).toBe(true);
  });
});
