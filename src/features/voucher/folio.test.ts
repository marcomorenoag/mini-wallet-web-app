import { describe, expect, it } from "vitest";

import { formatFolio } from "./folio";

describe("formatFolio", () => {
  it("derives a short uppercase reference from the transfer id", () => {
    expect(formatFolio("trf_3b151e46-6773-4023-935e-5c3945ae7f5b")).toBe("TX-3B151E46");
    expect(formatFolio("trf_ab-cd")).toBe("TX-ABCD");
  });
});
