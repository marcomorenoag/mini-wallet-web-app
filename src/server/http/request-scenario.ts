import "server-only";

import { readMockConfig } from "@/adapters/mock/mock-config";
import { type MockScenario, parseMockScenario } from "@/adapters/mock/mock-scenarios";

import { MOCK_SCENARIO_COOKIE } from "./cookie-names";

/** A header serves API clients and tests; a cookie also reaches page navigations. */
export const MOCK_SCENARIO_HEADER = "x-mock-scenario";

/** Satisfied by a `NextRequest` and by the `headers()` / `cookies()` stores of Server Actions. */
export interface ScenarioSource {
  readonly headers: { get(name: string): string | null };
  readonly cookies: { get(name: string): { value: string } | undefined };
}

/** Scenario forced by the caller, or `null` when none is set or overrides are disabled. */
export const readRequestScenario = (request: ScenarioSource): MockScenario | null => {
  if (!readMockConfig().scenarioOverrideEnabled) return null;
  return (
    parseMockScenario(request.headers.get(MOCK_SCENARIO_HEADER)) ??
    parseMockScenario(request.cookies.get(MOCK_SCENARIO_COOKIE)?.value)
  );
};
