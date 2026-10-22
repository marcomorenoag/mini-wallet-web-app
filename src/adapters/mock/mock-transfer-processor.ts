import type { TransferProcessor } from "@/ports/transfer-processor";

import { type Latency, type Sleep, sleep } from "./latency";
import {
  DEFAULT_SCENARIO_WEIGHTS,
  type MockScenario,
  pickScenario,
  type ScenarioWeights,
} from "./mock-scenarios";

interface Options {
  readonly latency: Latency;
  readonly timeoutDelayMs: number;
  /** Forces a scenario (tests, E2E); otherwise one is picked at random. */
  readonly scenario?: MockScenario | null;
  readonly weights?: ScenarioWeights;
  readonly random?: () => number;
  readonly wait?: Sleep;
}

/**
 * Simulated payment network. TIMEOUT is modelled as a slow approval: the response arrives after
 * the client has given up, so the outcome must be recovered through the status endpoint.
 */
export const createMockTransferProcessor = ({
  latency,
  timeoutDelayMs,
  scenario,
  weights = DEFAULT_SCENARIO_WEIGHTS,
  random = Math.random,
  wait = sleep,
}: Options): TransferProcessor => ({
  async process() {
    await latency();
    const outcome = scenario ?? pickScenario(weights, random);

    switch (outcome) {
      case "SUCCESS":
        return { status: "APPROVED" };
      case "TIMEOUT":
        await wait(timeoutDelayMs);
        return { status: "APPROVED" };
      case "INSUFFICIENT_FUNDS":
      case "NETWORK":
      case "UNKNOWN":
        return { status: "REJECTED", code: outcome };
    }
  },
});
