/** GET /api/health — liveness probe for orchestration and test runners; unversioned on purpose. */
export function GET(): Response {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
