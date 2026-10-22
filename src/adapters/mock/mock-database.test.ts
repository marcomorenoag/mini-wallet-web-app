import { afterEach, describe, expect, it } from "vitest";

import { createMockDatabase, getMockDatabase, resetMockDatabase } from "./mock-database";

describe("mock database", () => {
  afterEach(() => {
    resetMockDatabase();
  });

  it("seeds valid fixtures (they are parsed through the domain schemas)", () => {
    const db = createMockDatabase();
    expect(db.users.size).toBe(3);
    expect(db.accounts.size).toBe(3);
    expect(db.movements.length).toBeGreaterThan(0);
    expect(db.contacts.length).toBeGreaterThan(0);
  });

  it("keeps every fixture owned by an existing user or account", () => {
    const db = createMockDatabase();
    const accountIds = new Set(db.accounts.keys());
    for (const account of db.accounts.values()) expect(db.users.has(account.ownerId)).toBe(true);
    for (const contact of db.contacts) expect(db.users.has(contact.ownerId)).toBe(true);
    for (const movement of db.movements) expect(accountIds.has(movement.accountId)).toBe(true);
  });

  it("returns the same singleton until it is reset", () => {
    const db = getMockDatabase();
    db.contacts.length = 0;
    expect(getMockDatabase()).toBe(db);

    const fresh = resetMockDatabase();
    expect(getMockDatabase()).toBe(fresh);
    expect(fresh.contacts.length).toBeGreaterThan(0);
  });

  it("isolates instances, so seeds are never mutated", () => {
    const a = createMockDatabase();
    a.movements.length = 0;
    expect(createMockDatabase().movements.length).toBeGreaterThan(0);
  });
});
