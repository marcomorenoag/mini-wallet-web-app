import { describe, expect, it } from "vitest";

import { applyMockFault } from "./mock-faults";

describe("applyMockFault", () => {
  const setup = () => {
    const waits: number[] = [];
    const options = {
      timeoutDelayMs: 1_000,
      wait: async (ms: number) => {
        waits.push(ms);
      },
    };
    return { waits, options };
  };

  it.each(["NETWORK", "UNKNOWN"] as const)("fails the request with %s", async (scenario) => {
    const { options } = setup();
    expect(await applyMockFault(scenario, options)).toBe(scenario);
  });

  it("delays the request on TIMEOUT, then lets it through", async () => {
    const { waits, options } = setup();
    expect(await applyMockFault("TIMEOUT", options)).toBeNull();
    expect(waits).toEqual([1_000]);
  });

  it.each([null, "SUCCESS", "INSUFFICIENT_FUNDS"] as const)(
    "passes %s through",
    async (scenario) => {
      const { waits, options } = setup();
      expect(await applyMockFault(scenario, options)).toBeNull();
      expect(waits).toEqual([]);
    },
  );
});
