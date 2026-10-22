import { describe, expect, it } from "vitest";

import type { UserId } from "@/domain/user/user";
import { createInMemoryDeps } from "@/test/in-memory-deps";

import { makeListContacts, makeSaveContact } from "./contacts";

const ana = "usr_ana" as UserId;
const bruno = "usr_bruno" as UserId;

describe("listContacts", () => {
  it("lists favorites first, then by name, scoped to the owner", async () => {
    const listContacts = makeListContacts(createInMemoryDeps());

    expect((await listContacts(ana)).map((c) => [c.name, c.isFavorite])).toEqual([
      ["Luis Pérez", true],
      ["Marta Ruiz", true],
      ["Carlos Gómez", false],
    ]);
    expect(await listContacts(bruno)).toEqual([]);
  });
});

describe("saveContact", () => {
  it("stores a normalized contact for the owner", async () => {
    const deps = createInMemoryDeps();
    const saveContact = makeSaveContact(deps);

    const result = await saveContact(bruno, { name: " Sofía ", phone: "55 2222 3333" });

    expect(result).toEqual({
      ok: true,
      value: {
        id: "cnt_id-1",
        ownerId: "usr_bruno",
        name: "Sofía",
        phone: "+525522223333",
        isFavorite: true,
      },
    });
    expect(await makeListContacts(deps)(bruno)).toHaveLength(1);
  });

  it("rejects a phone already saved by the same owner", async () => {
    const saveContact = makeSaveContact(createInMemoryDeps());
    expect(await saveContact(ana, { name: "Luis 2", phone: "55 1111 2222" })).toEqual({
      ok: false,
      error: { kind: "VALIDATION", issues: [{ field: "phone", code: "CONTACT_ALREADY_EXISTS" }] },
    });
  });

  it("allows the same phone for a different owner", async () => {
    const saveContact = makeSaveContact(createInMemoryDeps());
    expect((await saveContact(bruno, { name: "Luis", phone: "55 1111 2222" })).ok).toBe(true);
  });

  it("reports validation issues", async () => {
    const saveContact = makeSaveContact(createInMemoryDeps());
    expect(await saveContact(ana, { name: "", phone: "1" })).toEqual({
      ok: false,
      error: {
        kind: "VALIDATION",
        issues: [
          { field: "name", code: "CONTACT_NAME_REQUIRED" },
          { field: "phone", code: "PHONE_INVALID" },
        ],
      },
    });
  });
});
