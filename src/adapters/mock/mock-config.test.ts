import { describe, expect, it } from "vitest";

import { parseLatency, readMockConfig } from "./mock-config";

describe("parseLatency", () => {
  it.each([
    ["0", { minMs: 0, maxMs: 0 }],
    ["300", { minMs: 300, maxMs: 300 }],
    [" 250 - 700 ", { minMs: 250, maxMs: 700 }],
  ])("parses %j", (input, expected) => {
    expect(parseLatency(input)).toEqual(expected);
  });

  it.each([undefined, "", "abc", "700-250", "-5"])("rejects %j", (input) => {
    expect(parseLatency(input)).toBeNull();
  });
});

describe("readMockConfig", () => {
  it("uses realistic latency in development and enables overrides", () => {
    expect(readMockConfig({ NODE_ENV: "development" })).toEqual({
      latency: { minMs: 250, maxMs: 700 },
      timeoutDelayMs: 15_000,
      scenarioOverrideEnabled: true,
    });
  });

  it("removes latency under test", () => {
    expect(readMockConfig({ NODE_ENV: "test" }).latency).toEqual({ minMs: 0, maxMs: 0 });
  });

  it("disables overrides in production unless explicitly enabled", () => {
    expect(readMockConfig({ NODE_ENV: "production" }).scenarioOverrideEnabled).toBe(false);
    expect(
      readMockConfig({ NODE_ENV: "production", MOCK_SCENARIO_OVERRIDE: "enabled" })
        .scenarioOverrideEnabled,
    ).toBe(true);
  });

  it("reads explicit values from the environment", () => {
    expect(
      readMockConfig({
        NODE_ENV: "development",
        MOCK_LATENCY_MS: "10-20",
        MOCK_TIMEOUT_DELAY_MS: "500",
        MOCK_SCENARIO_OVERRIDE: "disabled",
      }),
    ).toEqual({
      latency: { minMs: 10, maxMs: 20 },
      timeoutDelayMs: 500,
      scenarioOverrideEnabled: false,
    });
  });
});
