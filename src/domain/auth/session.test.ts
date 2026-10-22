import { describe, expect, it } from "vitest";

import { isSessionExpired } from "./session";

describe("isSessionExpired", () => {
  const session = { expiresAt: "2026-10-22T12:00:00.000Z" };

  it("is not expired before the expiry instant", () => {
    expect(isSessionExpired(session, new Date("2026-10-22T11:59:59.999Z"))).toBe(false);
  });

  it("is expired at and after the expiry instant", () => {
    expect(isSessionExpired(session, new Date("2026-10-22T12:00:00.000Z"))).toBe(true);
    expect(isSessionExpired(session, new Date("2026-10-22T12:00:00.001Z"))).toBe(true);
  });
});
