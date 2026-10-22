import { NextRequest, type NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/server/http/cookie-names";

type RouteHandler<P> = (
  request: NextRequest,
  context: { params: Promise<P> },
) => Promise<NextResponse> | NextResponse;

interface CallOptions<P> {
  readonly method?: string;
  readonly path?: string;
  readonly body?: unknown;
  readonly rawBody?: string;
  readonly headers?: Record<string, string>;
  readonly session?: string;
  readonly params?: P;
}

/** Invokes a route handler in-process, as Next.js would, with an optional session cookie. */
export const call = async <P = Record<string, never>>(
  handler: RouteHandler<P>,
  { method = "GET", path = "/", body, rawBody, headers = {}, session, params }: CallOptions<P> = {},
) => {
  const requestHeaders = new Headers(headers);
  if (session) requestHeaders.set("cookie", `${SESSION_COOKIE}=${session}`);
  if (body !== undefined) requestHeaders.set("content-type", "application/json");

  const request = new NextRequest(new URL(path, "http://localhost"), {
    method,
    headers: requestHeaders,
    ...(rawBody !== undefined ? { body: rawBody } : {}),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const response = await handler(request, { params: Promise.resolve((params ?? {}) as P) });
  const text = await response.text();

  return {
    response,
    status: response.status,
    body: text ? (JSON.parse(text) as unknown) : null,
    sessionCookie: response.cookies.get(SESSION_COOKIE),
  };
};
