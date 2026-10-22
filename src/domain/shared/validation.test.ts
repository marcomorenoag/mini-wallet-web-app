import { describe, expect, it } from "vitest";
import { z } from "zod";

import { toValidationIssues } from "./validation";

describe("toValidationIssues", () => {
  const Schema = z.object({
    name: z.string().min(1, { error: "CONTACT_NAME_REQUIRED" }),
    nested: z.object({ count: z.number() }),
  });

  it("maps declared error codes and field paths", () => {
    const result = Schema.safeParse({ name: "", nested: { count: "x" } });
    if (result.success) throw new Error("Expected a validation error");

    expect(toValidationIssues(result.error)).toEqual([
      { field: "name", code: "CONTACT_NAME_REQUIRED" },
      // Zod's default message is not a known code, so it falls back to INVALID.
      { field: "nested.count", code: "INVALID" },
    ]);
  });
});
