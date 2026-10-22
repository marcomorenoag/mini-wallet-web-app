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
    // Default weights: SUCCESS 60, INSUFFICIENT_FUNDS 10, NETWORK 10, TIMEOUT 10, UNKNOWN 10.
    expect(pickScenario(DEFAULT_SCENARIO_WEIGHTS, () => 0)).toBe("SUCCESS");
    expect(pickScenario(DEFAULT_SCENARIO_WEIGHTS, () => 0.59)).toBe("SUCCESS");
    expect(pickScenario(DEFAULT_SCENARIO_WEIGHTS, () => 0.6)).toBe("INSUFFICIENT_FUNDS");
    expect(pickScenario(DEFAULT_SCENARIO_WEIGHTS, () => 0.75)).toBe("NETWORK");
    expect(pickScenario(DEFAULT_SCENARIO_WEIGHTS, () => 0.85)).toBe("TIMEOUT");
    expect(pickScenario(DEFAULT_SCENARIO_WEIGHTS, () => 0.999)).toBe("UNKNOWN");
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
