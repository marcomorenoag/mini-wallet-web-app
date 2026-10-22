export interface LatencyRange {
  readonly minMs: number;
  readonly maxMs: number;
}

export interface MockConfig {
  /** Simulated latency added to every mock adapter call. */
  readonly latency: LatencyRange;
  /** How long the TIMEOUT scenario holds the response before completing. */
  readonly timeoutDelayMs: number;
  /** Whether a per-request scenario override (e.g. a test header) is honored. */
  readonly scenarioOverrideEnabled: boolean;
}

const DEFAULT_LATENCY: LatencyRange = { minMs: 250, maxMs: 700 };
const DEFAULT_TIMEOUT_DELAY_MS = 15_000;

/** Accepts `"300"` (fixed) or `"250-700"` (range). */
export const parseLatency = (value: string | undefined): LatencyRange | null => {
  const match = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(value ?? "");
  if (!match?.[1]) return null;
  const minMs = Number(match[1]);
  const maxMs = Number(match[2] ?? match[1]);
  return maxMs >= minMs ? { minMs, maxMs } : null;
};

const parseNonNegativeInt = (value: string | undefined): number | null =>
  value !== undefined && /^\d+$/.test(value.trim()) ? Number(value) : null;

/**
 * Reads the mock configuration from environment variables:
 * - `MOCK_LATENCY_MS`: `"0"`, `"300"` or `"250-700"` (default `250-700`, `0` under test)
 * - `MOCK_TIMEOUT_DELAY_MS`: delay of the TIMEOUT scenario (default `15000`)
 * - `MOCK_SCENARIO_OVERRIDE`: `"enabled"`/`"disabled"` (default: enabled outside production)
 */
export const readMockConfig = (
  env: Record<string, string | undefined> = process.env,
): MockConfig => {
  const isTest = env.NODE_ENV === "test";
  const override = env.MOCK_SCENARIO_OVERRIDE;

  return {
    latency:
      parseLatency(env.MOCK_LATENCY_MS) ?? (isTest ? { minMs: 0, maxMs: 0 } : DEFAULT_LATENCY),
    timeoutDelayMs: parseNonNegativeInt(env.MOCK_TIMEOUT_DELAY_MS) ?? DEFAULT_TIMEOUT_DELAY_MS,
    scenarioOverrideEnabled:
      override === undefined ? env.NODE_ENV !== "production" : override === "enabled",
  };
};
