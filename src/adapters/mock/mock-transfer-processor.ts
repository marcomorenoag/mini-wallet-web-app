import type { ProcessTransferResult, TransferProcessor } from "@/ports/transfer-processor";

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

/** Answer of the simulated payment network for each scenario. */
const RESULTS: Record<MockScenario, ProcessTransferResult> = {
  SUCCESS: { status: "APPROVED" },
  // A slow approval: the client gives up first and recovers the outcome by idempotency key.
  TIMEOUT: { status: "APPROVED" },
  INSUFFICIENT_FUNDS: { status: "REJECTED", code: "INSUFFICIENT_FUNDS" },
  NETWORK: { status: "REJECTED", code: "NETWORK" },
  UNKNOWN: { status: "REJECTED", code: "UNKNOWN" },
};

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
    if (outcome === "TIMEOUT") await wait(timeoutDelayMs);
    return RESULTS[outcome];
  },
});
