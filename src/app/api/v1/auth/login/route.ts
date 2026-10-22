import { toSessionUserDto } from "@/contracts/v1/dto";
import { publicHandler } from "@/server/http/api-handler";
import { json, problem, problemFromAppError } from "@/server/http/problem";
import { readJson } from "@/server/http/read-json";
import { setSessionCookie } from "@/server/http/session-cookie";

/** POST /api/v1/auth/login — starts a session for an email or phone identifier. */
export const POST = publicHandler(async ({ request, useCases }) => {
  const body = await readJson(request);
  if (!body.ok) return problem("BAD_REQUEST");

  const result = await useCases.login(body.value);
  if (!result.ok) return problemFromAppError(result.error);

  const response = json(toSessionUserDto(result.value.user));
  setSessionCookie(response, result.value.session);
  return response;
});
