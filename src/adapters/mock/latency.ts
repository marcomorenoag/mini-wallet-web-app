import type { LatencyRange } from "./mock-config";

export type Sleep = (ms: number) => Promise<void>;
export type Latency = () => Promise<void>;

export const sleep: Sleep = (ms) =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

export const createLatency =
  (
    { minMs, maxMs }: LatencyRange,
    random: () => number = Math.random,
    wait: Sleep = sleep,
  ): Latency =>
  () =>
    wait(minMs + Math.floor(random() * (maxMs - minMs + 1)));

export const noLatency: Latency = () => Promise.resolve();
