import "server-only";

import type { NextRequest, NextResponse } from "next/server";

import { applyMockFault } from "@/adapters/mock/mock-faults";
import { readMockConfig } from "@/adapters/mock/mock-config";
import type { MockScenario } from "@/adapters/mock/mock-scenarios";
import type { User } from "@/domain/user/user";

import { getUseCases, type UseCases } from "../container";
import { problem, problemFromAppError } from "./problem";
import { readRequestScenario } from "./request-scenario";
import { readSessionToken } from "./session-cookie";

interface BaseContext {
  readonly request: NextRequest;
  readonly useCases: UseCases;
  readonly scenario: MockScenario | null;
}

export type PublicContext = BaseContext;

export interface AuthenticatedContext extends BaseContext {
  readonly user: User;
}

interface Options {
  /**
   * Simulated faults (NETWORK, UNKNOWN, TIMEOUT) are applied before the handler runs. Disabled for
   * transfer confirmation, where the scenario drives the payment network outcome instead.
   */
  readonly simulateFaults?: boolean;
}

type Handler<C> = (context: C) => Promise<NextResponse>;

const run = async (
  request: NextRequest,
  { simulateFaults = true }: Options,
  next: (base: BaseContext) => Promise<NextResponse>,
): Promise<NextResponse> => {
  try {
    const scenario = readRequestScenario(request);
    if (simulateFaults) {
      const fault = await applyMockFault(scenario, readMockConfig());
      if (fault) return problem(fault);
    }
    return await next({ request, scenario, useCases: getUseCases({ scenario }) });
  } catch (error) {
    // Unexpected failures are logged server-side and never leak details to the client.
    console.error("[api] unhandled error", error);
    return problem("UNKNOWN");
  }
};

/** Wraps a public route handler with fault simulation and error handling. */
export const publicHandler =
  (handler: Handler<PublicContext>, options: Options = {}) =>
  (request: NextRequest): Promise<NextResponse> =>
    run(request, options, handler);

/**
 * Wraps a route handler that requires a session. Authentication is verified against the session
 * store on every request (Proxy only performs an optimistic cookie check).
 */
export const authenticatedHandler =
  <P extends Record<string, string> = Record<string, never>>(
    handler: (context: AuthenticatedContext & { readonly params: P }) => Promise<NextResponse>,
    options: Options = {},
  ) =>
  (request: NextRequest, segment: { params: Promise<P> }): Promise<NextResponse> =>
    run(request, options, async (base) => {
      const auth = await base.useCases.authenticate(readSessionToken(request));
      if (!auth.ok) return problemFromAppError(auth.error);
      return handler({ ...base, user: auth.value, params: await segment.params });
    });
