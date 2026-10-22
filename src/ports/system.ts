/** Time and id sources are injected, so use cases stay deterministic under test. */
export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}
