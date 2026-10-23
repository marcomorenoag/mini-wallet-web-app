import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

/**
 * Network mocking at the fetch level: components and API clients run their real `fetch` calls,
 * answered by handlers declared per test with `server.use(...)`.
 */
export const server = setupServer();

/** Registers the server lifecycle in the calling test file. */
export const setupMswServer = () => {
  beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
};

/** v1 path matcher for any origin (jsdom serves pages from http://localhost:3000). */
export const apiPath = (path: string) => `*/api/v1${path}`;
