import "server-only";

import { cookies, headers } from "next/headers";

import { applyMockFault } from "@/adapters/mock/mock-faults";
import { readMockConfig } from "@/adapters/mock/mock-config";

import { getUseCases } from "./container";
import { readRequestScenario } from "./http/request-scenario";
import { readSessionToken } from "./http/session-cookie";

/**
 * Server Component and Server Action counterpart of the route handler wrappers: resolves the
 * forced mock scenario and the session token from the request, exposes simulated faults and binds
 * the use cases to that scenario.
 */
export const getRequestContext = async () => {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);
  const scenario = readRequestScenario({ headers: headerStore, cookies: cookieStore });

  return {
    cookies: cookieStore,
    sessionToken: readSessionToken({ cookies: cookieStore }),
    useCases: getUseCases({ scenario }),
    /** Resolves to a fault code when the scenario forces one (NETWORK, UNKNOWN), else `null`. */
    simulateFault: () => applyMockFault(scenario, readMockConfig()),
  };
};
