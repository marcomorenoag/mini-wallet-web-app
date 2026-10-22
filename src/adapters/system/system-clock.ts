import type { Clock } from "@/ports/system";

export const systemClock: Clock = { now: () => new Date() };
