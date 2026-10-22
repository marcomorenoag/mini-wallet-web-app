import "server-only";

import type { NextRequest } from "next/server";

import { readMockConfig } from "@/adapters/mock/mock-config";
import { type MockScenario, parseMockScenario } from "@/adapters/mock/mock-scenarios";

import { MOCK_SCENARIO_COOKIE } from "./cookie-names";

/** A header serves API clients and tests; a cookie also reaches page navigations. */
export const MOCK_SCENARIO_HEADER = "x-mock-scenario";

/** Scenario forced by the caller, or `null` when none is set or overrides are disabled. */
export const readRequestScenario = (
  request: Pick<NextRequest, "headers" | "cookies">,
): MockScenario | null => {
  if (!readMockConfig().scenarioOverrideEnabled) return null;
  return (
    parseMockScenario(request.headers.get(MOCK_SCENARIO_HEADER)) ??
    parseMockScenario(request.cookies.get(MOCK_SCENARIO_COOKIE)?.value)
  );
};
