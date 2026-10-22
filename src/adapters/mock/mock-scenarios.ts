/** Outcomes simulated by the mock payment network on transfer confirmation. */
export const MOCK_SCENARIOS = [
  "SUCCESS",
  "INSUFFICIENT_FUNDS",
  "NETWORK",
  "TIMEOUT",
  "UNKNOWN",
] as const;

export type MockScenario = (typeof MOCK_SCENARIOS)[number];

export type ScenarioWeights = Readonly<Record<MockScenario, number>>;

/** Success is the most likely outcome; every failure path remains reachable at random. */
export const DEFAULT_SCENARIO_WEIGHTS: ScenarioWeights = {
  SUCCESS: 60,
  INSUFFICIENT_FUNDS: 10,
  NETWORK: 10,
  TIMEOUT: 10,
  UNKNOWN: 10,
};

export const isMockScenario = (value: unknown): value is MockScenario =>
  typeof value === "string" && (MOCK_SCENARIOS as readonly string[]).includes(value);

/** Case-insensitive parsing of an override value (e.g. from a header or cookie). */
export const parseMockScenario = (value: string | null | undefined): MockScenario | null => {
  const normalized = value?.trim().toUpperCase();
  return isMockScenario(normalized) ? normalized : null;
};

export const pickScenario = (
  weights: ScenarioWeights = DEFAULT_SCENARIO_WEIGHTS,
  random: () => number = Math.random,
): MockScenario => {
  const total = MOCK_SCENARIOS.reduce((sum, scenario) => sum + weights[scenario], 0);
  let threshold = random() * total;
  for (const scenario of MOCK_SCENARIOS) {
    threshold -= weights[scenario];
    if (threshold < 0) return scenario;
  }
  return "SUCCESS";
};
