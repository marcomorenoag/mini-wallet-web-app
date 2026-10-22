import { type Contact, NewContactInputSchema } from "@/domain/contact/contact";
import { err, ok, type Result } from "@/domain/shared/result";
import { toValidationIssues } from "@/domain/shared/validation";
import type { UserId } from "@/domain/user/user";
import type { ContactRepository } from "@/ports/contact-repository";

import { type AppError, fieldError, validationError } from "../errors";

const byFavoriteThenName = (a: Contact, b: Contact): number =>
  Number(b.isFavorite) - Number(a.isFavorite) || a.name.localeCompare(b.name, "es-MX");

export const makeListContacts =
  ({ contacts }: { contacts: ContactRepository }) =>
  async (userId: UserId): Promise<readonly Contact[]> =>
    [...(await contacts.listByOwnerId(userId))].sort(byFavoriteThenName);

export const makeSaveContact =
  ({ contacts }: { contacts: ContactRepository }) =>
  async (userId: UserId, input: unknown): Promise<Result<Contact, AppError>> => {
    const parsed = NewContactInputSchema.safeParse(input);
    if (!parsed.success) return err(validationError(toValidationIssues(parsed.error)));

    if (await contacts.findByPhone(userId, parsed.data.phone)) {
      return err(fieldError("phone", "CONTACT_ALREADY_EXISTS"));
    }

    return ok(await contacts.create(userId, parsed.data));
  };
