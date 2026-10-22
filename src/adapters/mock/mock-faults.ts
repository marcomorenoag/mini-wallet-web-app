import { type Sleep, sleep } from "./latency";
import type { MockScenario } from "./mock-scenarios";

export type MockFault = "NETWORK" | "UNKNOWN";

/**
 * Simulated infrastructure faults for read and auth endpoints ("simulated error" states).
 * NETWORK and UNKNOWN fail the request; TIMEOUT delays it beyond the client's patience;
 * other scenarios only apply to transfer confirmations, so they pass through.
 */
export const applyMockFault = async (
  scenario: MockScenario | null,
  { timeoutDelayMs, wait = sleep }: { readonly timeoutDelayMs: number; readonly wait?: Sleep },
): Promise<MockFault | null> => {
  switch (scenario) {
    case "NETWORK":
    case "UNKNOWN":
      return scenario;
    case "TIMEOUT":
      await wait(timeoutDelayMs);
      return null;
    default:
      return null;
  }
};
