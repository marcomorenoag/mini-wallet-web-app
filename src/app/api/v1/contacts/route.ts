import { toContactDto } from "@/contracts/v1/dto";
import { authenticatedHandler } from "@/server/http/api-handler";
import { json, problem, problemFromAppError } from "@/server/http/problem";
import { readJson } from "@/server/http/read-json";

/** GET /api/v1/contacts — saved contacts, favorites first. */
export const GET = authenticatedHandler(async ({ user, useCases }) =>
  json({ items: (await useCases.listContacts(user.id)).map(toContactDto) }),
);

/** POST /api/v1/contacts — saves a new contact. */
export const POST = authenticatedHandler(async ({ request, user, useCases }) => {
  const body = await readJson(request);
  if (!body.ok) return problem("BAD_REQUEST");

  const result = await useCases.saveContact(user.id, body.value);
  return result.ok
    ? json(toContactDto(result.value), { status: 201 })
    : problemFromAppError(result.error);
});
