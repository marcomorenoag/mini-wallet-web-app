import "server-only";

import { cookies, headers } from "next/headers";

import { applyMockFault } from "@/adapters/mock/mock-faults";
import { readMockConfig } from "@/adapters/mock/mock-config";

import { getUseCases } from "../container";
import { readRequestScenario } from "../http/request-scenario";

/**
 * Server Action counterpart of the route handler wrappers: resolves the forced mock scenario from
 * the request, exposes simulated faults and binds the use cases to that scenario.
 */
export const getActionContext = async () => {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);
  const scenario = readRequestScenario({ headers: headerStore, cookies: cookieStore });

  return {
    cookies: cookieStore,
    useCases: getUseCases({ scenario }),
    /** Resolves to a fault code when the scenario forces one (NETWORK, UNKNOWN), else `null`. */
    simulateFault: () => applyMockFault(scenario, readMockConfig()),
  };
};
