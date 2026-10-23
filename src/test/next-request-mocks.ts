import { vi } from "vitest";

/**
 * In-memory stand-ins for `next/headers` and `next/navigation`, for Server Actions and Server
 * Components tested outside Next.js. Register them with:
 *   vi.mock("next/headers", () => nextHeadersMock(request));
 *   vi.mock("next/navigation", () => nextNavigationMock());
 */
export interface FakeRequest {
  headers: Headers;
  readonly cookies: Map<string, { value: string; options?: unknown }>;
}

export const createFakeRequest = (): FakeRequest => ({
  headers: new Headers(),
  cookies: new Map(),
});

export const nextHeadersMock = (request: FakeRequest) => ({
  headers: async () => request.headers,
  cookies: async () => ({
    get: (name: string) => request.cookies.get(name),
    set: (name: string, value: string, options?: unknown) =>
      request.cookies.set(name, { value, options }),
    delete: (name: string) => request.cookies.delete(name),
  }),
});

/** `redirect` throws a control-flow signal in Next.js; the destination is captured instead. */
export class Redirect extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
}

export const nextNavigationMock = () => ({
  redirect: vi.fn((url: string) => {
    throw new Redirect(url);
  }),
});
