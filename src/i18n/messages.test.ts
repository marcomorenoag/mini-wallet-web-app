import { describe, expect, it } from "vitest";

import { PROBLEM_CODES } from "@/contracts/v1/problem";
import { VALIDATION_ERROR_CODES } from "@/domain/shared/error-codes";
import messages from "../../messages/es-MX.json";

describe("es-MX dictionary", () => {
  it("has a message for every validation error code", () => {
    expect(Object.keys(messages.errors.validation).sort()).toEqual(
      [...VALIDATION_ERROR_CODES].sort(),
    );
  });

  it("has a message for every API problem code", () => {
    expect(Object.keys(messages.errors.problem).sort()).toEqual([...PROBLEM_CODES].sort());
  });
});
