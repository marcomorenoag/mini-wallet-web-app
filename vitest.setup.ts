import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Globals are disabled, so React Testing Library's auto-cleanup is wired up explicitly.
afterEach(() => {
  cleanup();
});
