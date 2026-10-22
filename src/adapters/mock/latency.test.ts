import { describe, expect, it } from "vitest";

import { createLatency } from "./latency";

describe("createLatency", () => {
  it("waits for a duration within the configured range", async () => {
    const waits: number[] = [];
    const wait = async (ms: number) => {
      waits.push(ms);
    };

    await createLatency({ minMs: 100, maxMs: 200 }, () => 0, wait)();
    await createLatency({ minMs: 100, maxMs: 200 }, () => 0.999, wait)();

    expect(waits).toEqual([100, 200]);
  });
});
