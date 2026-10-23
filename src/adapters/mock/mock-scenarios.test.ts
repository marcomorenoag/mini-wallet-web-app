import { describe, expect, it } from "vitest";

import { DEFAULT_SCENARIO_WEIGHTS, parseMockScenario, pickScenario } from "./mock-scenarios";

describe("parseMockScenario", () => {
  it.each([
    ["timeout", "TIMEOUT"],
    [" Network ", "NETWORK"],
    ["SUCCESS", "SUCCESS"],
  ])("parses %j", (input, expected) => {
    expect(parseMockScenario(input)).toBe(expected);
  });

  it.each([null, undefined, "", "boom"])("ignores %j", (input) => {
    expect(parseMockScenario(input)).toBeNull();
  });
});

describe("pickScenario", () => {
  it("maps the random value onto the cumulative weights", () => {
    // Default weights: SUCCESS 70, INSUFFICIENT_FUNDS 0, NETWORK 10, TIMEOUT 10, UNKNOWN 10.
    expect(pickScenario(DEFAULT_SCENARIO_WEIGHTS, () => 0)).toBe("SUCCESS");
    expect(pickScenario(DEFAULT_SCENARIO_WEIGHTS, () => 0.69)).toBe("SUCCESS");
    expect(pickScenario(DEFAULT_SCENARIO_WEIGHTS, () => 0.7)).toBe("NETWORK");
    expect(pickScenario(DEFAULT_SCENARIO_WEIGHTS, () => 0.85)).toBe("TIMEOUT");
    expect(pickScenario(DEFAULT_SCENARIO_WEIGHTS, () => 0.999)).toBe("UNKNOWN");
  });

  it("never draws insufficient funds by default, so it cannot contradict the balance", () => {
    for (let r = 0; r < 1; r += 0.001) {
      expect(pickScenario(DEFAULT_SCENARIO_WEIGHTS, () => r)).not.toBe("INSUFFICIENT_FUNDS");
    }
  });

  it("never picks a zero-weight scenario", () => {
    const onlyNetwork = {
      SUCCESS: 0,
      INSUFFICIENT_FUNDS: 0,
      NETWORK: 1,
      TIMEOUT: 0,
      UNKNOWN: 0,
    };
    for (const r of [0, 0.5, 0.999]) expect(pickScenario(onlyNetwork, () => r)).toBe("NETWORK");
  });
});
