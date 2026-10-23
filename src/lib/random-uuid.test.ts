import { afterEach, describe, expect, it, vi } from "vitest";

import { IdempotencyKeySchema } from "@/domain/transfer/transfer";

import { randomUUID } from "./random-uuid";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("randomUUID", () => {
  it("uses the native generator when it is available", () => {
    expect(randomUUID()).toMatch(UUID_V4);
  });

  it("falls back to random values outside secure contexts", () => {
    // Plain HTTP on a LAN address: `randomUUID` is not exposed, `getRandomValues` is.
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });

    const ids = Array.from({ length: 50 }, randomUUID);
    for (const id of ids) {
      expect(id).toMatch(UUID_V4);
      expect(IdempotencyKeySchema.safeParse(id).success).toBe(true);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});
