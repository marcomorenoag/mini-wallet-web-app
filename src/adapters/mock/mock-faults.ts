import { type Sleep, sleep } from "./latency";
import type { MockScenario } from "./mock-scenarios";

export type MockFault = "NETWORK" | "UNKNOWN";

/** Fault raised by each scenario; the others only apply to transfer confirmations. */
const FAULTS: Record<MockScenario, MockFault | null> = {
  NETWORK: "NETWORK",
  UNKNOWN: "UNKNOWN",
  TIMEOUT: null,
  SUCCESS: null,
  INSUFFICIENT_FUNDS: null,
};

/**
 * Simulated infrastructure faults for read and auth endpoints ("simulated error" states).
 * NETWORK and UNKNOWN fail the request; TIMEOUT delays it beyond the client's patience;
 * other scenarios only apply to transfer confirmations, so they pass through.
 */
export const applyMockFault = async (
  scenario: MockScenario | null,
  { timeoutDelayMs, wait = sleep }: { readonly timeoutDelayMs: number; readonly wait?: Sleep },
): Promise<MockFault | null> => {
  if (scenario === null) return null;
  if (scenario === "TIMEOUT") await wait(timeoutDelayMs);
  return FAULTS[scenario];
};
